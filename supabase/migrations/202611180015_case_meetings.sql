create table public.consultation_messages(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.consultation_cases on delete cascade,
 author_id uuid not null references public.profiles,body text not null check(length(trim(body)) between 1 and 2000),created_at timestamptz not null default now()
);
create table public.meeting_requests(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.consultation_cases on delete cascade,
 note text not null check(length(trim(note)) between 1 and 1000),status text not null default 'requested' check(status in('requested','scheduled','closed')),created_at timestamptz not null default now()
);
create table public.consultation_meetings(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.consultation_cases on delete cascade,
 advisor_id uuid not null references public.profiles,request_id uuid references public.meeting_requests,
 starts_at timestamptz not null,ends_at timestamptz not null,time_zone text not null,
 meet_url text not null check(meet_url ~ '^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$'),
 status text not null default 'scheduled' check(status in('scheduled','completed','cancelled')),note text not null default '' check(length(note)<=1000),
 created_at timestamptz not null default now(),check(ends_at>starts_at and ends_at<=starts_at+interval '4 hours')
);
alter table public.consultation_messages enable row level security;
alter table public.meeting_requests enable row level security;
alter table public.consultation_meetings enable row level security;
revoke all on public.consultation_messages,public.meeting_requests,public.consultation_meetings from public,anon,authenticated;
grant select on public.consultation_messages,public.meeting_requests,public.consultation_meetings to authenticated;
create policy case_messages_read on public.consultation_messages for select to authenticated using(private.can_access_case(user_id));
create policy meeting_requests_read on public.meeting_requests for select to authenticated using(private.can_access_case(user_id));
create policy case_meetings_read on public.consultation_meetings for select to authenticated using(private.can_access_case(user_id));
create function private.notify_case_owner(p_user uuid,p_event text,p_key uuid,p_meet text default null,p_starts timestamptz default null) returns void language plpgsql security definer set search_path='' as $$
declare recipient text;
begin
 select email into recipient from auth.users where id=p_user;
 insert into private.notification_outbox(event,recipient,payload,dedupe_key) values(p_event,recipient,jsonb_build_object('reference','ISG consultation','meetUrl',p_meet,'startsAt',p_starts),p_event||':'||p_key::text) on conflict(dedupe_key) do nothing;
end $$;
create function private.payment_owner_update() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.payment_status is distinct from new.payment_status then perform private.notify_case_owner(new.user_id,'payment_update',gen_random_uuid());end if;return new;
end $$;
create trigger payment_owner_update after update of payment_status on public.consultation_cases for each row execute function private.payment_owner_update();
create function public.send_consultation_message(p_user uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
declare msg uuid;c public.consultation_cases;
begin
 if not private.can_access_case(p_user) then raise exception 'Access denied';end if;
 select * into c from public.consultation_cases where user_id=p_user;
 if c.payment_status<>'verified' then raise exception 'Payment verification required';end if;
 if (select count(*) from public.consultation_messages where author_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'Please wait a minute';end if;
 insert into public.consultation_messages(user_id,author_id,body) values(p_user,auth.uid(),trim(p_body)) returning id into msg;
 if auth.uid()<>p_user then perform private.notify_case_owner(p_user,'consultation_reply',msg);else perform private.queue_admin_event('consultation.follow_up',msg);end if;
end $$;
create function public.request_consultation_meeting(p_note text) returns void language plpgsql security definer set search_path='' as $$
declare request uuid;
begin
 if not private.active_user() or not exists(select 1 from public.consultation_cases where user_id=auth.uid() and payment_status='verified') then raise exception 'Payment verification required';end if;
 if(select count(*) from public.meeting_requests where user_id=auth.uid() and created_at>now()-interval '1 minute')>=3 then raise exception 'Please wait a minute';end if;
 insert into public.meeting_requests(user_id,note) values(auth.uid(),trim(p_note)) returning id into request;
 perform private.queue_admin_event('meeting.requested',request);
end $$;
create function public.schedule_consultation_meeting(p_user uuid,p_start timestamptz,p_end timestamptz,p_zone text,p_url text,p_request uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare meeting uuid;c public.consultation_cases;
begin
 if not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(p_user) then raise exception 'Access denied';end if;
 select * into c from public.consultation_cases where user_id=p_user for update;
 if c.payment_status<>'verified' then raise exception 'Payment verification required';end if;
 if p_start<=now() or p_start>now()+interval '2 years' or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_zone) then raise exception 'Invalid meeting date or time zone';end if;
 if p_request is not null and not exists(select 1 from public.meeting_requests where id=p_request and user_id=p_user and status='requested') then raise exception 'Request unavailable';end if;
 -- Serialize scheduling by advisor to avoid overlapping bookings across different students.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,15));
 if exists(select 1 from public.consultation_meetings where status='scheduled' and (advisor_id=auth.uid() or user_id=p_user) and starts_at<p_end and ends_at>p_start) then raise exception 'Meeting overlaps an existing booking';end if;
 insert into public.consultation_meetings(user_id,advisor_id,request_id,starts_at,ends_at,time_zone,meet_url) values(p_user,auth.uid(),p_request,p_start,p_end,p_zone,p_url) returning id into meeting;
 update public.meeting_requests set status='scheduled' where id=p_request;
 perform private.notify_case_owner(p_user,'meeting_scheduled',meeting,p_url,p_start);
 perform private.queue_admin_event('meeting.scheduled',meeting);
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'meeting.scheduled',meeting);return meeting;
end $$;
create function public.finish_consultation_meeting(p_meeting uuid,p_status text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare m public.consultation_meetings;
begin
 select * into m from public.consultation_meetings where id=p_meeting for update;
 if not found or not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(m.user_id) then raise exception 'Access denied';end if;
 if m.status<>'scheduled' or p_status not in('completed','cancelled') or length(trim(p_note))<3 or length(p_note)>1000 then raise exception 'Invalid meeting update';end if;
 if p_status='completed' and m.starts_at>now() then raise exception 'Meeting has not started';end if;
 update public.consultation_meetings set status=p_status,note=trim(p_note) where id=p_meeting;
 if p_status='completed' then update public.consultation_cases set completed_at=coalesce(completed_at,now()) where user_id=m.user_id and payment_status='verified';end if;
 perform private.notify_case_owner(m.user_id,'meeting_'||p_status,gen_random_uuid());
 insert into public.audit_logs(actor_id,action,entity_id,metadata) values(auth.uid(),'meeting.updated',p_meeting,jsonb_build_object('status',p_status));
end $$;
revoke all on function private.notify_case_owner(uuid,text,uuid,text,timestamptz),private.payment_owner_update(),public.send_consultation_message(uuid,text),public.request_consultation_meeting(text),public.schedule_consultation_meeting(uuid,timestamptz,timestamptz,text,text,uuid),public.finish_consultation_meeting(uuid,text,text) from public,anon,authenticated;
grant execute on function public.send_consultation_message(uuid,text),public.request_consultation_meeting(text),public.schedule_consultation_meeting(uuid,timestamptz,timestamptz,text,text,uuid),public.finish_consultation_meeting(uuid,text,text) to authenticated;
