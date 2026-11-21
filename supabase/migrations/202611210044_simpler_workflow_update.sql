-- Workflow updates are now just: workflow state, official decision, next step.
create or replace function public.update_study_application(p_application uuid, p_status text, p_decision text, p_decision_date date, p_evidence text, p_note text, p_next text, p_next_date date) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.study_applications;allowed text[];
begin
 select * into a from public.study_applications where id=p_application for update;
 if not found or not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(a.user_id) then raise exception 'Access denied';end if;
 if a.package_state is not null and (a.package_state<>'paid' or not private.case_has_advisor(a.user_id))
 then raise exception 'Verified package payment and advisor assignment required'; end if;
 allowed:=case a.status when 'Starting' then array['Starting','Applying','Cancelled'] when 'Applying' then array['Applying','Waiting for decision','Accepted','Rejected','Cancelled'] when 'Waiting for decision' then array['Waiting for decision','Accepted','Rejected','Cancelled'] when 'Accepted' then array['Accepted','Cancelled'] else array[a.status] end;
 if not p_status=any(allowed) then raise exception 'Invalid workflow transition';end if;
 if p_status in('Applying','Waiting for decision','Accepted','Rejected') and a.approval<>'approved' then raise exception 'Applicant approval required';end if;
 if a.package_state is null and p_status='Applying' and exists(select 1 from public.document_requests r where r.user_id=a.user_id and r.required and not exists(select 1 from public.case_files f where f.user_id=a.user_id and f.kind='document' and f.category=r.category and f.review_status='approved')) then raise exception 'Required documents need approval';end if;
 if p_decision in('Accepted','Rejected','Withdrawn') then
   if p_decision_date is null then p_decision_date:=current_date; end if;
   if p_decision_date>current_date then raise exception 'Decision date cannot be in the future'; end if;
 end if;
 if(p_status='Accepted' and p_decision<>'Accepted') or(p_status='Rejected' and p_decision<>'Rejected') then raise exception 'Official decision required';end if;
 if p_note is null or length(trim(p_note))<3 then p_note:=p_status; end if;
 if length(p_note)>2000 then raise exception 'History note too long';end if;
 update public.study_applications set status=p_status,provider_decision=p_decision,provider_decision_date=p_decision_date,provider_evidence=coalesce(p_evidence,''),next_step=coalesce(p_next,''),next_date=p_next_date,updated_at=now() where id=a.id;
 insert into public.study_application_history(application_id,actor_id,status,provider_decision,note) values(a.id,auth.uid(),p_status,p_decision,trim(p_note));
 perform private.notify_case_owner(a.user_id,'application_update',gen_random_uuid());perform private.queue_admin_event('application.updated',gen_random_uuid());
end $$;