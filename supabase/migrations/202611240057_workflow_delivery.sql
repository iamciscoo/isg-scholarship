-- Keep new registration details on the queued event snapshot. The existing
-- account trigger still fires once per registration and keeps its dedupe key.
create or replace function private.account_event() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' and new.email is not null then
    perform private.queue_admin_event_with_details('account.created',new.id,jsonb_strip_nulls(jsonb_build_object(
      'registeredEmail',new.email,
      'applicantName',coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),
        nullif(btrim(concat_ws(' ',new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'last_name')),'')),
      'status',case when new.email_confirmed_at is null then 'Awaiting email confirmation' else 'Email confirmed' end
    )));
  end if;
  return new;
end $$;

create function private.notify_consultation_stage() returns trigger
language plpgsql security definer set search_path='' as $$
declare applicant uuid; stage text;
begin
  select a.applicant_id into applicant from public.eligibility_assessments a
    join public.profiles p on p.id=a.applicant_id and p.status='active'
    where a.id=new.assessment_id;
  if applicant is null then return new; end if;
  stage:=case new.stage
    when 'new' then 'New'
    when 'under_review' then 'Under review'
    when 'more_information' then 'Needs information'
    when 'qualified' then 'Completed'
    when 'converted' then 'Completed'
    else 'Closed' end;
  perform private.notify_case_owner_with_details(applicant,'consultation_stage_update',gen_random_uuid(),
    jsonb_build_object('status',stage));
  return new;
end $$;
create trigger notify_consultation_stage after update of stage on public.leads
  for each row when (old.stage is distinct from new.stage) execute function private.notify_consultation_stage();
revoke all on function private.notify_consultation_stage() from public,anon,authenticated;

-- Present aggregate provider errors to admins without exposing message text or recipients.
create function public.notification_delivery_failures()
returns table(channel text,error text,total bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.has_role(array['admin']::public.staff_role[]) and coalesce(auth.jwt()->>'role','')<>'service_role'
  then raise exception 'Access denied'; end if;
  return query
  select failures.channel,failures.error,count(*)
  from (
    select 'Applicant email'::text as channel,n.last_error as error from private.notification_outbox n
    where n.state in ('pending','failed') and n.last_error is not null
      and n.event not in ('team_assessment','team_enquiry')
    union all
    select case i.channel when 'email' then 'Admin email' else 'Admin WhatsApp' end,i.last_error
    from private.integration_events i where i.state in ('pending','failed','uncertain') and i.last_error is not null
  ) failures group by failures.channel,failures.error order by count(*) desc limit 20;
end $$;
revoke all on function public.notification_delivery_failures() from public,anon,authenticated;
grant execute on function public.notification_delivery_failures() to authenticated,service_role;
