alter table private.integration_events add column payload jsonb not null default '{}'::jsonb;

alter table private.integration_settings
  alter column admin_emails set default array['support@isgscholarship.org'];
update private.integration_settings s set admin_emails=case
  when cardinality(admin_emails)=0 then array['support@isgscholarship.org']
  else (select array_agg(distinct case when lower(address)='hello@isgscholarship.com'
    then 'support@isgscholarship.org' else address end) from unnest(s.admin_emails) address)
  end
where s.id;

-- Remove the retired official address from unsent work, subject to the event's existing deduplication.
delete from private.integration_events old using private.integration_events replacement
where old.channel='email' and old.state='pending' and old.attempts=0
  and lower(old.recipient)='hello@isgscholarship.com'
  and replacement.channel=old.channel and replacement.event=old.event
  and replacement.entity_id=old.entity_id and replacement.recipient='support@isgscholarship.org';
update private.integration_events set recipient='support@isgscholarship.org'
where channel='email' and state='pending' and attempts=0 and lower(recipient)='hello@isgscholarship.com';
update private.notification_outbox set recipient='support@isgscholarship.org'
where event in ('team_assessment','team_enquiry') and state='pending' and attempts=0
  and lower(recipient)='hello@isgscholarship.com';

alter table public.account_notifications drop constraint account_notifications_link_check;
alter table public.account_notifications add constraint account_notifications_link_check check(
  link='' or link ~ '^/(dashboard(/profile|/consultations|/application|/applications(/[0-9a-f-]{36})?)?|eligibility|contact|pathways|how-it-works|services|pricing|faqs|admin/(inbox|enquiries|consultations|payments|applications|settings)|admin/(receipts|declarations|cases|applications)/[0-9a-f-]{36})$'
);

create function private.case_notification_details(p_user uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'userId',p.id,
    'firstName',coalesce(nullif(a.first_name,''),nullif(p.first_name,'')),
    'applicantName',coalesce(
      nullif(trim(concat_ws(' ',a.first_name,a.last_name)),''),
      nullif(trim(concat_ws(' ',p.first_name,p.last_name)),'')
    ),
    'reference',a.reference,'studyField',nullif(a.preferred_fields,''),
    'destination',nullif(a.destinations,'')
  ))
  from public.profiles p
  left join public.consultation_cases c on c.user_id=p.id
  left join public.leads l on l.id=c.lead_id
  left join public.eligibility_assessments a on a.id=l.assessment_id
  where p.id=p_user;
$$;

create function private.admin_notification_details(p_event text,p_entity uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  details jsonb;
  applicant uuid;
begin
  case
    when p_event='consultation.received' then
      select jsonb_build_object('applicantName',trim(concat_ws(' ',a.first_name,a.last_name)),
        'reference',a.reference,'studyField',a.preferred_fields,'destination',a.destinations,
        'status','Awaiting receipt') into details from public.eligibility_assessments a where a.id=p_entity;
    when p_event like 'account.%' then
      select jsonb_build_object('applicantName',nullif(trim(concat_ws(' ',
        u.raw_user_meta_data->>'first_name',u.raw_user_meta_data->>'last_name')),''),
        'status',case when p_event='account.created' then 'Registered' else 'Verified' end)
      into details from auth.users u where u.id=p_entity;
    when p_event='lead.updated' then
      select a.applicant_id,jsonb_build_object('status',initcap(replace(l.stage::text,'_',' ')))
      into applicant,details from public.leads l join public.eligibility_assessments a on a.id=l.assessment_id
      where l.id=p_entity;
    when p_event in ('payment.receipt_received','payment.reviewed','consultation.support_received','application.document_received') then
      select f.user_id,jsonb_build_object(
        'status',case f.review_status when 'pending' then 'Pending review' else initcap(f.review_status) end,
        'documentName',case when f.kind='receipt' then
          case when f.application_id is null then 'Consultation payment receipt' else 'Package payment receipt' end
          else initcap(replace(f.category,'_',' ')) end,
        'applicationName',a.proposal->>'name'
      ) into applicant,details from public.case_files f
      left join public.study_applications a on a.id=f.application_id where f.id=p_entity;
    when p_event in ('meeting.requested','whatsapp_call.requested','whatsapp_call.cancelled') then
      select r.user_id,jsonb_build_object('status',initcap(r.status),
        'startsAt',case when p_event='meeting.requested' and r.note ~ '^Preferred [0-9]{4}-[0-9]{2}-[0-9]{2} at '
          then split_part(r.note,' · ',1) end)
      into applicant,details from public.meeting_requests r where r.id=p_entity;
    when p_event='meeting.scheduled' then
      select m.user_id,jsonb_build_object('status','Scheduled',
        'startsAt',to_char(m.starts_at at time zone 'UTC','YYYY-MM-DD HH24:MI')||' UTC')
      into applicant,details from public.consultation_meetings m where m.id=p_entity;
    when p_event='meeting.completed' then
      applicant:=p_entity;
      details:=jsonb_build_object('status','Completed');
    when p_event='application.form_received' then
      select d.user_id,jsonb_build_object(
        'applicantName',trim(concat_ws(' ',d.data->>'firstName',d.data->>'lastName')),
        'studyField',d.data->>'studyInterest','applicationName',d.data->>'programme',
        'status','Submitted')
      into applicant,details from public.application_declarations d where d.id=p_entity;
    when p_event in ('application.updated','package.accepted') then
      select a.user_id,jsonb_build_object('status',a.status,'applicationName',a.proposal->>'name',
        'path','/admin/applications/'||a.id::text) into applicant,details
      from public.study_applications a where a.id=p_entity;
    else null;
  end case;
  return coalesce(private.case_notification_details(applicant),'{}'::jsonb)
    || coalesce(jsonb_strip_nulls(details),'{}'::jsonb);
end $$;

create function private.queue_admin_event_with_details(p_event text,p_entity uuid,p_details jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare settings private.integration_settings; details jsonb; destination text; heading text; body text;
begin
  select * into settings from private.integration_settings where id;
  details:=private.admin_notification_details(p_event,p_entity)
    || coalesce(jsonb_strip_nulls(p_details),'{}'::jsonb);
  if details->>'userId' ~ '^[0-9a-f-]{36}$' then
    details:=coalesce(private.case_notification_details((details->>'userId')::uuid),'{}'::jsonb)||details;
  end if;
  destination:=case
    when p_event='enquiry.received' then '/admin/enquiries'
    when p_event like 'account.%' then '/admin/settings'
    when p_event in ('payment.receipt_received','payment.reviewed') then '/admin/receipts/'||p_entity::text
    when p_event='application.form_received' then '/admin/declarations/'||p_entity::text
    when p_event in ('application.reviewed','application.document_received','application.information_received')
      and details->>'applicationId' ~ '^[0-9a-f-]{36}$'
      then '/admin/declarations/'||(details->>'applicationId')
    when details->>'path' ~ '^/admin/applications/[0-9a-f-]{36}$' then details->>'path'
    when details->>'userId' ~ '^[0-9a-f-]{36}$' then '/admin/cases/'||(details->>'userId')
    when p_event like 'application.%' or p_event='package.accepted' then '/admin/applications'
    else '/admin/consultations' end;
  heading:=case p_event
    when 'enquiry.received' then 'New advisor enquiry'
    when 'account.created' then 'New student account'
    when 'consultation.received' then 'Consultation submitted'
    when 'consultation.support_received' then 'Consultation supporting file received'
    when 'payment.receipt_received' then 'Payment receipt to review'
    when 'payment.reviewed' then 'Payment receipt reviewed'
    when 'meeting.requested' then 'Consultation meeting requested'
    when 'meeting.scheduled' then 'Consultation meeting scheduled'
    when 'meeting.completed' then 'Consultation meeting completed'
    when 'whatsapp_call.requested' then 'WhatsApp consultation requested'
    when 'whatsapp_call.cancelled' then 'WhatsApp consultation request cancelled'
    when 'application.unlocked' then 'Scholarship application unlocked'
    when 'application.form_received' then 'Application form received'
    when 'application.reviewed' then 'Scholarship application reviewed'
    when 'application.document_received' then 'Application document received'
    when 'application.information_received' then 'Requested application information received'
    else 'New ISG workspace update' end;
  body:=concat_ws(' · ',nullif(details->>'applicantName',''),nullif(details->>'reference',''),
    nullif(details->>'status',''),nullif(details->>'documentName',''));
  details:=details||jsonb_build_object('path',destination);

  insert into private.integration_events(channel,event,entity_id,recipient,payload)
  select 'email',p_event,p_entity,target,details from unnest(settings.admin_emails) target
  on conflict do nothing;
  if settings.whatsapp_group<>'' then
    insert into private.integration_events(channel,event,entity_id,recipient,payload)
    values('whatsapp',p_event,p_entity,settings.whatsapp_group,details) on conflict do nothing;
  end if;
  insert into public.account_notifications(title,body,link,recipient_id,request_id)
  select heading,case when length(body)>=5 then left(body,2000) else 'Open the private workspace for details.' end,
    destination,p.id,md5('staff:'||p_event||':'||p_entity::text||':'||p.id::text)::uuid
  from public.profiles p join public.user_roles r on r.user_id=p.id where p.status='active' and r.role='admin'
  on conflict(request_id) do nothing;
end $$;

create or replace function private.queue_admin_event(p_event text,p_entity uuid) returns void
language sql security definer set search_path='' as $$
  select private.queue_admin_event_with_details(p_event,p_entity,'{}'::jsonb);
$$;

create or replace function private.lead_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare ctx jsonb;
begin
  if new.stage is distinct from old.stage or new.advisor_id is distinct from old.advisor_id then
    ctx:=private.admin_notification_details('lead.updated',new.id);
    perform private.queue_admin_event_with_details('lead.updated',gen_random_uuid(),ctx);
  end if;
  return new;
end $$;

create function private.consultation_received_inbox() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.applicant_id is not null and new.applicant_id is distinct from old.applicant_id then
    insert into public.account_notifications(title,body,link,recipient_id,request_id)
    values('Consultation received','Open Consultations for payment instructions and to upload your receipt.',
      '/dashboard/consultations',new.applicant_id,md5('consultation.received:'||new.id::text)::uuid)
    on conflict(request_id) do nothing;
  end if;
  return new;
end $$;
create trigger consultation_received_inbox after update of applicant_id on public.eligibility_assessments
  for each row execute function private.consultation_received_inbox();

create function private.notify_case_owner_with_details(p_user uuid,p_event text,p_key uuid,p_details jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare recipient text; details jsonb; heading text; destination text; body text;
begin
  select email into recipient from auth.users where id=p_user;
  if recipient is null then return; end if;
  details:=coalesce(private.case_notification_details(p_user),'{}'::jsonb)
    || coalesce(jsonb_strip_nulls(p_details),'{}'::jsonb);
  heading:=case p_event
    when 'payment_update' then case details->>'status'
      when 'Verified' then 'Consultation receipt approved'
      when 'Rejected' then 'New consultation receipt needed'
      when 'Pending verification' then 'Consultation receipt received'
      else 'Consultation payment update' end
    when 'advisor_assigned' then 'Advisor assigned'
    when 'meeting_requested' then 'Consultation meeting requested'
    when 'meeting_scheduled' then 'Consultation scheduled'
    when 'meeting_cancelled' then 'Consultation cancelled'
    when 'meeting_completed' then 'Consultation completed'
    when 'whatsapp_call_requested' then 'WhatsApp consultation requested'
    when 'whatsapp_call_cancelled' then 'WhatsApp consultation request cancelled'
    when 'consultation_reply' then 'Your advisor replied'
    when 'application_unlocked' then 'Application ready to complete'
    when 'full_application_submitted' then 'Scholarship application received'
    when 'full_application_review' then 'Scholarship application update'
    when 'full_application_information' then 'More application information needed'
    when 'document_request' then 'Application document requested'
    when 'document_update' then 'Application document reviewed'
    when 'package_recommended' then 'Scholarship package ready to review'
    when 'package_payment_update' then 'Package receipt reviewed'
    when 'package_accepted' then 'Scholarship package quote accepted'
    when 'opportunity_proposed' then 'Scholarship package shared'
    when 'application_update' then 'Application progress update'
    else 'ISG workspace update' end;
  destination:=case
    when p_event like 'full_application_%' or p_event like 'document_%' or p_event='application_unlocked'
      then '/dashboard/application'
    when p_event in ('package_payment_update','application_update','package_accepted','package_recommended','opportunity_proposed')
      then '/dashboard/applications'||case when details->>'applicationId' ~ '^[0-9a-f-]{36}$' then '/'||(details->>'applicationId') else '' end
    else '/dashboard/consultations' end;
  body:=concat_ws(' · ',nullif(details->>'status',''),nullif(details->>'documentName',''),nullif(details->>'nextStep',''));
  if length(body)<5 then body:='Open your workspace for the latest details.'; end if;

  insert into private.notification_outbox(event,recipient,payload,dedupe_key)
  values(p_event,recipient,details||jsonb_build_object('path',destination),p_event||':'||p_key::text)
  on conflict(dedupe_key) do nothing;
  insert into public.account_notifications(title,body,link,recipient_id,request_id)
  values(heading,left(body,2000),destination,p_user,md5('applicant:'||p_event||':'||p_key::text||':'||p_user::text)::uuid)
  on conflict(request_id) do nothing;
end $$;

create or replace function private.notify_case_owner(p_user uuid,p_event text,p_key uuid,p_meet text default null,p_starts timestamptz default null)
returns void language plpgsql security definer set search_path='' as $$
declare details jsonb:='{}'::jsonb;
begin
  case p_event
    when 'payment_update' then
      select jsonb_build_object('status',case c.payment_status
        when 'pending_verification' then 'Pending verification'
        when 'verified' then 'Verified' when 'rejected' then 'Rejected' else 'Awaiting receipt' end,
        'nextStep',case c.payment_status
        when 'pending_verification' then 'Wait for ISG to review your receipt.'
        when 'verified' then 'Open Consultations to arrange your meeting.'
        when 'rejected' then 'Read the review feedback and upload a replacement receipt.'
        else 'Follow the payment instructions and upload your receipt.' end)
      into details from public.consultation_cases c where c.user_id=p_user;
    when 'package_payment_update' then
      select jsonb_build_object('applicationId',f.application_id,'applicationName',a.proposal->>'name',
        'status',case f.review_status when 'approved' then 'Verified' else 'Rejected' end)
      into details from public.case_files f left join public.study_applications a on a.id=f.application_id
      where f.id=p_key;
    when 'package_recommended','package_accepted','opportunity_proposed' then
      select jsonb_build_object('applicationId',a.id,'applicationName',a.proposal->>'name',
        'status',initcap(replace(coalesce(a.package_state,a.status),'_',' ')))
      into details from public.study_applications a where a.id=p_key;
    when 'meeting_scheduled' then
      details:=jsonb_build_object('status','Scheduled','meetUrl',p_meet,'startsAt',p_starts);
    when 'meeting_completed' then details:=jsonb_build_object('status','Completed');
    when 'meeting_cancelled' then details:=jsonb_build_object('status','Cancelled');
    else null;
  end case;
  perform private.notify_case_owner_with_details(p_user,p_event,p_key,coalesce(details,'{}'::jsonb));
end $$;

revoke all on function private.case_notification_details(uuid),private.admin_notification_details(text,uuid),
  private.queue_admin_event_with_details(text,uuid,jsonb),private.notify_case_owner_with_details(uuid,text,uuid,jsonb),
  private.consultation_received_inbox()
  from public,anon,authenticated;
