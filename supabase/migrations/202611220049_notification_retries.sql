alter table private.notification_outbox
  add column first_attempt_at timestamptz,
  add column delivery_uncertain boolean not null default false;
alter table private.integration_events
  add column first_attempt_at timestamptz,
  add column delivery_uncertain boolean not null default false;

-- A deployment may already have leased or attempted old events. Treat unknown delivery
-- outcomes as a potential send once the provider's idempotency window has passed.
update private.notification_outbox set first_attempt_at=created_at,
  delivery_uncertain=last_error is not distinct from 'provider_unavailable_or_rejected' where attempts>0;
update private.integration_events set first_attempt_at=created_at where attempts>0;

create or replace function public.claim_notifications(p_limit integer default 10)
returns setof private.notification_outbox language plpgsql security definer set search_path='' as $$
begin
  update private.notification_outbox set state='failed',lease_until=null,last_error='resend_delivery_unconfirmed'
  where (state='processing' and lease_until<now() and (attempts>=5 or first_attempt_at<now()-interval '23 hours'))
     or (state='pending' and first_attempt_at<now()-interval '23 hours' and delivery_uncertain);
  return query update private.notification_outbox n
    set state='processing',attempts=n.attempts+1,lease_id=gen_random_uuid(),
      lease_until=now()+interval '2 minutes',first_attempt_at=coalesce(n.first_attempt_at,now()),
      delivery_uncertain=n.delivery_uncertain or n.state='processing'
  where n.id in (
    select q.id from private.notification_outbox q
    where ((q.state='pending' and q.available_at<=now()) or (q.state='processing' and q.lease_until<now()))
      and q.attempts<5
    order by q.available_at,q.created_at for update skip locked limit least(greatest(p_limit,1),25)
  ) returning n.*;
end $$;

create or replace function public.finish_notification(p_id uuid,p_lease uuid,p_provider_id text,p_error text) returns void
language plpgsql security definer set search_path='' as $$
begin
  update private.notification_outbox set
    state=case when p_error is null then 'sent'
      when attempts>=5 or p_error in ('resend_http_400','resend_http_422') then 'failed'
      else 'pending' end,
    provider_id=p_provider_id,last_error=p_error,
    delivery_uncertain=delivery_uncertain or coalesce(p_error='resend_unconfirmed' or p_error like 'resend_http_5%',false),
    sent_at=case when p_error is null then now() end,
    available_at=now()+make_interval(secs=>least(900,30*power(2,attempts)::integer)),
    lease_until=null
  where id=p_id and lease_id=p_lease and state='processing';
end $$;

create or replace function public.claim_integration_events(p_email boolean,p_whatsapp boolean)
returns setof private.integration_events language plpgsql security definer set search_path='' as $$
begin
  update private.integration_events set state='uncertain',last_error='worker_interrupted',lease_until=null
  where state='sending' and lease_until<now()
    and (channel='whatsapp' or attempts>=5 or first_attempt_at<now()-interval '23 hours');
  update private.integration_events set state='uncertain',last_error='resend_delivery_unconfirmed'
  where channel='email' and state='pending' and first_attempt_at<now()-interval '23 hours'
    and delivery_uncertain;
  update private.integration_events e set state='failed',last_error='recipient_changed'
  from private.integration_settings s where s.id
    and (e.state='pending' or (e.state='sending' and e.lease_until<now()))
    and ((e.channel='email' and not e.recipient=any(s.admin_emails))
      or (e.channel='whatsapp' and e.recipient<>s.whatsapp_group));
  return query with candidates as (
    select id from private.integration_events
    where attempts<5 and (
      (channel='email' and p_email and ((state='pending' and available_at<=now()) or (state='sending' and lease_until<now())))
      or (channel='whatsapp' and p_whatsapp and state='pending' and available_at<=now())
    )
    order by available_at,created_at for update skip locked limit 10
  )
  update private.integration_events e
    set state='sending',attempts=e.attempts+1,lease_id=gen_random_uuid(),
      lease_until=now()+interval '2 minutes',first_attempt_at=coalesce(e.first_attempt_at,now()),
      delivery_uncertain=e.delivery_uncertain or e.state='sending'
  from candidates c where e.id=c.id returning e.*;
end $$;

create or replace function public.update_study_application(p_application uuid, p_status text, p_decision text,
  p_decision_date date, p_evidence text, p_note text, p_next text, p_next_date date) returns void
language plpgsql security definer set search_path='' as $$
declare a public.study_applications; allowed text[]; update_id uuid; details jsonb;
begin
  select * into a from public.study_applications where id=p_application for update;
  if not found or not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(a.user_id)
  then raise exception 'Access denied'; end if;
  if a.package_state is not null and (a.package_state<>'paid' or not private.case_has_advisor(a.user_id))
  then raise exception 'Verified package payment and advisor assignment required'; end if;
  allowed:=case a.status
    when 'Starting' then array['Starting','Applying','Cancelled']
    when 'Applying' then array['Applying','Waiting for decision','Accepted','Rejected','Cancelled']
    when 'Waiting for decision' then array['Waiting for decision','Accepted','Rejected','Cancelled']
    when 'Accepted' then array['Accepted','Cancelled'] else array[a.status] end;
  if not p_status=any(allowed) then raise exception 'Invalid workflow transition'; end if;
  if p_status in ('Applying','Waiting for decision','Accepted','Rejected') and a.approval<>'approved'
  then raise exception 'Applicant approval required'; end if;
  if a.package_state is null and p_status='Applying' and exists (
    select 1 from public.document_requests r where r.user_id=a.user_id and r.required and not exists (
      select 1 from public.case_files f where f.user_id=a.user_id and f.kind='document'
        and f.category=r.category and f.review_status='approved'
    )
  ) then raise exception 'Required documents need approval'; end if;
  if p_decision in ('Accepted','Rejected','Withdrawn') then
    p_decision_date:=coalesce(p_decision_date,current_date);
    if p_decision_date>current_date then raise exception 'Decision date cannot be in the future'; end if;
  end if;
  if (p_status='Accepted' and p_decision<>'Accepted') or (p_status='Rejected' and p_decision<>'Rejected')
  then raise exception 'Official decision required'; end if;
  if p_note is null or length(trim(p_note))<3 then p_note:=p_status; end if;
  if length(p_note)>2000 then raise exception 'History note too long'; end if;

  update public.study_applications set status=p_status,provider_decision=p_decision,
    provider_decision_date=p_decision_date,provider_evidence=coalesce(p_evidence,''),
    next_step=coalesce(p_next,''),next_date=p_next_date,updated_at=now() where id=a.id;
  insert into public.study_application_history(application_id,actor_id,status,provider_decision,note)
  values(a.id,auth.uid(),p_status,p_decision,trim(p_note)) returning id into update_id;

  details:=jsonb_build_object('userId',a.user_id,'applicationId',a.id,
    'applicationName',a.proposal->>'name','status',p_status);
  perform private.notify_case_owner_with_details(a.user_id,'application_update',update_id,
    details||jsonb_build_object('nextStep',nullif(trim(p_next),'')));
  perform private.queue_admin_event_with_details('application.updated',update_id,
    details||jsonb_build_object('path','/admin/applications/'||a.id::text));
end $$;

create or replace function public.finish_integration_event(p_id uuid,p_lease uuid,p_provider text,p_state text,p_error text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_state not in ('sent','failed','uncertain','pending') then raise exception 'Invalid state'; end if;
  update private.integration_events set
    state=case when p_state='pending' and attempts>=5 then 'failed' else p_state end,
    provider_id=p_provider,last_error=p_error,lease_until=null,
    delivery_uncertain=delivery_uncertain or coalesce(p_error='resend_unconfirmed' or p_error like 'resend_http_5%',false),
    available_at=now()+make_interval(secs=>least(900,30*power(2,attempts)::integer))
  where id=p_id and lease_id=p_lease and state='sending';
end $$;

create index integration_events_ready on private.integration_events(channel,available_at,created_at)
where state='pending';

create or replace function public.admin_alert_settings() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  return (
    select jsonb_build_object('emails',s.admin_emails,'whatsapp_group',s.whatsapp_group,'delivery',(
      select coalesce(jsonb_agg(t),'[]'::jsonb)
      from (
        select case channel when 'email' then 'Admin email' else 'Admin WhatsApp' end as channel,state,count(*)
        from private.integration_events group by channel,state
        union all
        select 'Applicant email',state,count(*) from private.notification_outbox
        where event not in ('team_assessment','team_enquiry') group by state
      ) t
    )) from private.integration_settings s where s.id
  );
end $$;
