create function private.case_has_advisor(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.consultation_cases c
    join public.leads l on l.id=c.lead_id
    join public.profiles p on p.id=l.advisor_id and p.status='active'
    join public.user_roles r on r.user_id=p.id and r.role='advisor'
    where c.user_id=p_user and c.payment_status='verified'
  );
$$;

create function public.consultation_advisor(p_user uuid) returns text
language sql stable security definer set search_path='' as $$
  select coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),'ISG advisor')
  from public.consultation_cases c
  join public.leads l on l.id=c.lead_id
  join public.profiles p on p.id=l.advisor_id
  where c.user_id=p_user and private.can_access_case(p_user) and private.case_has_advisor(p_user);
$$;

create function private.guard_advisor_assignment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.advisor_id is distinct from old.advisor_id and new.advisor_id is not null
    and not exists(select 1 from public.consultation_cases where lead_id=new.id and payment_status='verified')
  then raise exception 'Verify consultation payment first'; end if;
  return new;
end $$;
create trigger guard_advisor_assignment before update of advisor_id on public.leads
for each row execute function private.guard_advisor_assignment();

create function private.guard_consultation_support() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not private.case_has_advisor(new.user_id) then raise exception 'Advisor assignment required'; end if;
  return new;
end $$;
create trigger guard_consultation_message before insert on public.consultation_messages
for each row execute function private.guard_consultation_support();
create trigger guard_meeting_request before insert on public.meeting_requests
for each row execute function private.guard_consultation_support();
create trigger guard_consultation_meeting before insert on public.consultation_meetings
for each row execute function private.guard_consultation_support();

create function public.assign_consultation_advisor(p_user uuid,p_advisor uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.consultation_cases; assigned uuid;
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  select * into c from public.consultation_cases where user_id=p_user for update;
  if not found or c.payment_status<>'verified' then raise exception 'Verify consultation payment first'; end if;
  if not exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id
    where r.user_id=p_advisor and r.role='advisor' and p.status='active')
  then raise exception 'Advisor is not active'; end if;
  select advisor_id into assigned from public.leads where id=c.lead_id for update;
  if assigned=p_advisor then return; end if;
  update public.leads set advisor_id=p_advisor,stage=case when stage='new' then 'under_review'::public.lead_stage else stage end
  where id=c.lead_id;
  insert into public.audit_logs(actor_id,action,entity_id,metadata)
  values(auth.uid(),'advisor.assigned',c.lead_id,jsonb_build_object('advisor_id',p_advisor));
  perform private.notify_case_owner(p_user,'advisor_assigned',gen_random_uuid());
end $$;

revoke all on function private.case_has_advisor(uuid),private.guard_advisor_assignment(),private.guard_consultation_support(),
  public.consultation_advisor(uuid),public.assign_consultation_advisor(uuid,uuid) from public,anon,authenticated;
grant execute on function public.consultation_advisor(uuid),public.assign_consultation_advisor(uuid,uuid) to authenticated;

create or replace function public.review_lead(p_id uuid,p_stage public.lead_stage,p_reason text,p_advisor uuid,p_follow_up date)
returns void language plpgsql security definer set search_path='' as $$
declare original public.leads;
begin
  select * into original from public.leads where id=p_id for update;
  if not found or not private.can_review(p_id) then raise exception 'Access denied'; end if;
  if p_advisor is distinct from original.advisor_id then raise exception 'Use consultation advisor assignment'; end if;
  update public.leads set stage=p_stage,follow_up=p_follow_up where id=p_id;
  insert into public.audit_logs(actor_id,action,entity_id,metadata) values(
    auth.uid(),'lead.reviewed',p_id,jsonb_build_object('from',original.stage,'to',p_stage)
  );
end $$;

create or replace function public.schedule_consultation_meeting(p_user uuid,p_start timestamptz,p_end timestamptz,p_zone text,p_url text,p_request uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare meeting uuid; assigned uuid; c public.consultation_cases;
begin
 if not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(p_user) then raise exception 'Access denied';end if;
 select * into c from public.consultation_cases where user_id=p_user for update;
 if not private.case_has_advisor(p_user) then raise exception 'Advisor assignment required';end if;
 select advisor_id into assigned from public.leads where id=c.lead_id for share;
 if p_start<=now() or p_start>now()+interval '2 years' or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_zone) then raise exception 'Invalid meeting date or time zone';end if;
 if p_request is not null and not exists(select 1 from public.meeting_requests where id=p_request and user_id=p_user and status='requested') then raise exception 'Request unavailable';end if;
 -- Serialize scheduling by advisor to avoid overlapping bookings across different students.
 perform pg_advisory_xact_lock(hashtextextended(assigned::text,15));
 if exists(select 1 from public.consultation_meetings where status='scheduled' and (advisor_id=assigned or user_id=p_user) and starts_at<p_end and ends_at>p_start) then raise exception 'Meeting overlaps an existing booking';end if;
 insert into public.consultation_meetings(user_id,advisor_id,request_id,starts_at,ends_at,time_zone,meet_url) values(p_user,assigned,p_request,p_start,p_end,p_zone,p_url) returning id into meeting;
 update public.meeting_requests set status='scheduled' where id=p_request;
 perform private.notify_case_owner(p_user,'meeting_scheduled',meeting,p_url,p_start);
 perform private.queue_admin_event('meeting.scheduled',meeting);
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'meeting.scheduled',meeting);return meeting;
end $$;
