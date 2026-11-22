-- Serialize draft saves with submission so a stale tab cannot reopen a submitted consultation.
create or replace function public.save_my_consultation_draft(p_data jsonb,p_step integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.active_user() then raise exception 'Access denied'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,48));
 if exists(select 1 from public.eligibility_assessments where applicant_id=auth.uid()) then
   raise exception 'Consultation already submitted' using errcode='23505';
 end if;
 insert into public.consultation_drafts(user_id,data,step,updated_at) values(auth.uid(),p_data,p_step,now())
 on conflict(user_id) do update set data=excluded.data,step=excluded.step,updated_at=excluded.updated_at;
 if length(trim(p_data->>'firstName'))>0 and length(trim(p_data->>'lastName'))>0 then
  update public.profiles set first_name=trim(p_data->>'firstName'),last_name=trim(p_data->>'lastName'),
   phone=coalesce(p_data->>'phone',phone),nationality=coalesce(p_data->>'nationality',nationality),residence=coalesce(p_data->>'residence',residence)
  where id=auth.uid();
 end if;
end $$;

create or replace function public.submit_my_consultation(p_data jsonb,p_key uuid,p_hash text,p_user uuid,p_team_email text default '') returns text
language plpgsql security definer set search_path='' as $$
declare result text; existing public.eligibility_assessments; account_email text;
begin
 select u.email into account_email from auth.users u join public.profiles p on p.id=u.id where u.id=p_user and p.status='active';
 if account_email is null or lower(p_data->>'email') is distinct from lower(account_email) then raise exception 'Account unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,48));
 select * into existing from public.eligibility_assessments where applicant_id=p_user;
 if found and existing.idempotency_key is distinct from p_key then
   raise exception 'Consultation already submitted' using errcode='23505';
 end if;
 result:=public.submit_assessment(p_data,p_key,p_user::text||':'||p_hash,p_team_email);
 if existing.id is not null then return result; end if;
 select * into existing from public.eligibility_assessments where idempotency_key=p_key for update;
 if existing.applicant_id is not null then raise exception 'Access denied'; end if;
 update public.eligibility_assessments set applicant_id=p_user where id=existing.id;
 update public.profiles set first_name=existing.first_name,last_name=existing.last_name,phone=existing.phone,
   nationality=existing.nationality,residence=existing.residence where id=p_user;
 delete from public.consultation_drafts where user_id=p_user;
 return result;
end $$;

alter table public.meeting_requests
 add column channel text not null default 'online' check(channel in ('online','whatsapp')),
 add column requested_by uuid references public.profiles on delete set null;
create unique index one_open_whatsapp_call_per_case on public.meeting_requests(user_id)
 where channel='whatsapp' and status='requested';

create function public.request_whatsapp_call(p_user uuid,p_note text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare case_row public.consultation_cases; request_id uuid;
begin
 if not private.can_access_case(p_user) then raise exception 'Access denied';end if;
 select * into case_row from public.consultation_cases where user_id=p_user for update;
 if not found or case_row.payment_status<>'verified' then raise exception 'Consultation approval required';end if;
 if p_note is null or length(trim(p_note))>200 then raise exception 'Invalid note';end if;
 insert into public.meeting_requests(user_id,channel,requested_by,note)
 values(p_user,'whatsapp',auth.uid(),coalesce(nullif(trim(p_note),''),'WhatsApp call'))
 on conflict (user_id) where channel='whatsapp' and status='requested' do nothing
 returning id into request_id;
 if request_id is null then return null; end if;
 if auth.uid()=p_user then
   perform private.queue_admin_event_with_details('whatsapp_call.requested',request_id,
     jsonb_build_object('userId',p_user,'status','Requested','nextStep','Open the consultation to contact the applicant.'));
 else
   perform private.notify_case_owner_with_details(p_user,'whatsapp_call_requested',request_id,
     jsonb_build_object('status','Requested','nextStep','Open Consultations to see your request and contact ISG.'));
 end if;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'whatsapp_call.requested',request_id);
 return request_id;
end $$;

create function public.close_whatsapp_call(p_request uuid) returns void
language plpgsql security definer set search_path='' as $$
declare request_row public.meeting_requests;
begin
 select * into request_row from public.meeting_requests where id=p_request and channel='whatsapp';
 if not found or not private.can_access_case(request_row.user_id) then raise exception 'Access denied';end if;
 if auth.uid()=request_row.user_id and auth.uid() is distinct from request_row.requested_by then raise exception 'Access denied';end if;
 perform 1 from public.consultation_cases where user_id=request_row.user_id for update;
 update public.meeting_requests set status='closed' where id=p_request and status='requested';
 if not found then return;end if;
 if auth.uid()=request_row.user_id then
   perform private.queue_admin_event_with_details('whatsapp_call.cancelled',p_request,
     jsonb_build_object('userId',request_row.user_id,'status','Cancelled'));
 else
   perform private.notify_case_owner_with_details(request_row.user_id,'whatsapp_call_cancelled',p_request,
     jsonb_build_object('status','Cancelled','nextStep','You can request another consultation call.'));
 end if;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'whatsapp_call.cancelled',p_request);
end $$;

create function private.unlock_consultation_application(p_user uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare event_id uuid:=gen_random_uuid();
begin
 update public.consultation_cases set completed_at=now()
 where user_id=p_user and payment_status='verified' and completed_at is null;
 if not found then return false;end if;
 update public.meeting_requests set status='closed' where user_id=p_user and channel='whatsapp' and status='requested';
 perform private.notify_case_owner_with_details(p_user,'application_unlocked',event_id,
   jsonb_build_object('status','Application unlocked','nextStep','Complete the scholarship application and upload your documents.'));
 perform private.queue_admin_event_with_details('application.unlocked',event_id,
   jsonb_build_object('userId',p_user,'status','Consultation complete'));
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'application.unlocked',p_user);
 return true;
end $$;

create function public.complete_consultation_call(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(p_user)
 then raise exception 'Access denied';end if;
 perform 1 from public.consultation_cases where user_id=p_user and payment_status='verified' for update;
 if not found then raise exception 'Consultation approval required';end if;
 perform private.unlock_consultation_application(p_user);
end $$;

create or replace function public.finish_consultation_meeting(p_meeting uuid,p_status text,p_note text) returns void
language plpgsql security definer set search_path='' as $$
declare m public.consultation_meetings;
begin
 select * into m from public.consultation_meetings where id=p_meeting for update;
 if not found or not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(m.user_id) then raise exception 'Access denied';end if;
 if m.status<>'scheduled' or p_status is null or p_status not in('completed','cancelled') or p_note is null or length(p_note)>1000 then raise exception 'Invalid meeting update';end if;
 update public.consultation_meetings set status=p_status,note=trim(p_note) where id=p_meeting;
 if p_status<>'completed' or not private.unlock_consultation_application(m.user_id) then
   perform private.notify_case_owner(m.user_id,'meeting_'||p_status,gen_random_uuid());
 end if;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'meeting.updated',p_meeting,jsonb_build_object('status',p_status));
end $$;

revoke all on function private.unlock_consultation_application(uuid), public.request_whatsapp_call(uuid,text),
 public.close_whatsapp_call(uuid),public.complete_consultation_call(uuid) from public,anon,authenticated;
grant execute on function public.request_whatsapp_call(uuid,text),public.close_whatsapp_call(uuid),
 public.complete_consultation_call(uuid) to authenticated;
