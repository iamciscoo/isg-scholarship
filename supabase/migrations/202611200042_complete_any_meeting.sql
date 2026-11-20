-- Meetings often happen on WhatsApp or a call, so staff finish them early and without a written note.
create or replace function public.finish_consultation_meeting(p_meeting uuid, p_status text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.consultation_meetings;
begin
 select * into m from public.consultation_meetings where id=p_meeting for update;
 if not found or not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(m.user_id) then raise exception 'Access denied';end if;
 if m.status<>'scheduled' or p_status not in('completed','cancelled') or length(p_note)>1000 then raise exception 'Invalid meeting update';end if;
 update public.consultation_meetings set status=p_status,note=trim(p_note) where id=p_meeting;
 if p_status='completed' then update public.consultation_cases set completed_at=coalesce(completed_at,now()) where user_id=m.user_id and payment_status='verified';end if;
 perform private.notify_case_owner(m.user_id,'meeting_'||p_status,gen_random_uuid());
 insert into public.audit_logs(actor_id,action,entity_id,metadata) values(auth.uid(),'meeting.updated',p_meeting,jsonb_build_object('status',p_status));
end $$;