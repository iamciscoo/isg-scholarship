-- Admins contact applicants and assign the package after consultation payment.
create or replace function public.propose_application(p_user uuid,p_opportunity uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.consultation_cases; a public.study_applications; o private.opportunities; result uuid;
begin
 if not private.has_role(array['admin']::public.staff_role[]) or not private.can_access_case(p_user)
 then raise exception 'Access denied';end if;
 select * into c from public.consultation_cases where user_id=p_user for update;
 if not found or c.payment_status<>'verified' then raise exception 'Verify consultation payment first';end if;
 select * into a from public.study_applications where user_id=p_user
   and status not in ('Cancelled','Rejected','Completed') order by created_at desc limit 1;
 if found then
   if a.opportunity_id=p_opportunity then return a.id;end if;
   raise exception 'Applicant already has an assigned package';
 end if;
 select * into o from private.opportunities where id=p_opportunity and active and package_fee_tzs is not null
   and (deadline is null or deadline>=current_date);
 if not found then raise exception 'Package unavailable';end if;
 perform public.assign_consultation_advisor(p_user,auth.uid());
 insert into public.study_applications(user_id,opportunity_id,proposal,approval,approved_at,package_state)
 values(p_user,p_opportunity,private.scholarship_snapshot(o),'approved',now(),
   case when o.package_fee_tzs=0 then 'paid' else 'awaiting_receipt' end) returning id into result;
 insert into public.study_application_history(application_id,actor_id,status,provider_decision,note)
 values(result,auth.uid(),'Starting','Not received','ISG assigned this package.');
 perform private.notify_case_owner_with_details(p_user,'package_recommended',result,
   jsonb_build_object('applicationId',result,'status','Package assigned','nextStep','Pay the package fee and upload your receipt.'));
 perform private.queue_admin_event_with_details('application.updated',result,
   jsonb_build_object('userId',p_user,'status','Package assigned'));
 return result;
end $$;

create function private.unlock_paid_application() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.package_state='paid' and (tg_op='INSERT' or old.package_state is distinct from 'paid') then
   update public.consultation_cases set completed_at=coalesce(completed_at,now())
   where user_id=new.user_id and payment_status='verified';
   perform private.notify_case_owner_with_details(new.user_id,'application_unlocked',new.id,
     jsonb_build_object('status','Package payment verified','nextStep','Complete the application form and upload your documents.'));
 end if;
 return new;
end $$;
create trigger unlock_paid_application after insert or update of package_state on public.study_applications
 for each row execute function private.unlock_paid_application();

create function private.has_paid_application(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.study_applications a join public.consultation_cases c on c.user_id=a.user_id
   where a.user_id=p_user and a.package_state='paid' and a.status<>'Cancelled' and c.payment_status='verified');
$$;
create function private.guard_paid_application() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='case_files' then
   if new.kind<>'document' then return new;end if;
 end if;
 if tg_table_name in ('application_declarations','application_form_drafts') and exists(
   select 1 from public.consultation_cases where user_id=new.user_id
     and application_status is not null and application_status not in ('submitted','needs_information')
 ) then raise exception 'Application review is closed';end if;
 if not private.has_paid_application(new.user_id) then raise exception 'Verify package payment first';end if;
 return new;
end $$;
create trigger paid_form_draft before insert or update on public.application_form_drafts
 for each row execute function private.guard_paid_application();
create trigger paid_declaration before insert on public.application_declarations
 for each row execute function private.guard_paid_application();
create trigger paid_documents before insert on public.case_files
 for each row execute function private.guard_paid_application();

-- Retire the self-service meeting, package-selection and acceptance entry points.
revoke execute on function public.request_whatsapp_call(uuid,text),public.close_whatsapp_call(uuid),
 public.complete_consultation_call(uuid),public.request_consultation_meeting(text),
 public.schedule_consultation_meeting(uuid,timestamptz,timestamptz,text,text,uuid),
 public.finish_consultation_meeting(uuid,text,text),public.select_scholarship_package(uuid),
 public.approve_application(uuid,boolean),public.commit_study_place(uuid,boolean),
 public.send_consultation_message(uuid,text) from authenticated;

alter table public.consultation_cases drop constraint consultation_cases_application_status_check;
alter table public.consultation_cases add constraint consultation_cases_application_status_check
 check(application_status in ('submitted','in_review','needs_information','approved','declined','applying','waiting','accepted','rejected','completed','cancelled'));
alter table public.full_application_updates drop constraint full_application_updates_status_check;
alter table public.full_application_updates add constraint full_application_updates_status_check
 check(status in ('submitted','in_review','needs_information','approved','declined','applying','waiting','accepted','rejected','completed','cancelled'));

create or replace function public.review_full_application(p_declaration uuid,p_previous_status text,p_status text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare applicant uuid;c public.consultation_cases;update_id uuid;label text;v_note text;
begin
 select user_id into applicant from public.application_declarations where id=p_declaration;
 if applicant is null or not private.has_role(array['admin']::public.staff_role[]) or not private.can_access_case(applicant)
 then raise exception 'Access denied';end if;
 select * into c from public.consultation_cases where user_id=applicant for update;
 if c.current_declaration_id is distinct from p_declaration or c.application_status is distinct from p_previous_status
 then raise exception 'Application changed';end if;
 if not private.has_paid_application(applicant) then raise exception 'Verify package payment first';end if;
 label:=case p_status when 'submitted' then 'Submitted' when 'in_review' then 'In review'
   when 'needs_information' then 'Information requested' when 'approved' then 'Approved by ISG'
   when 'declined' then 'Declined by ISG' when 'applying' then 'Applying'
   when 'waiting' then 'Waiting for decision' when 'accepted' then 'Accepted'
   when 'rejected' then 'Rejected' when 'completed' then 'Completed' when 'cancelled' then 'Cancelled' end;
 if label is null or length(coalesce(p_note,''))>2000 then raise exception 'Invalid update';end if;
 v_note:=coalesce(nullif(trim(p_note),''),label);
 if p_status=c.application_status and exists(select 1 from public.full_application_updates
   where user_id=applicant and declaration_id=p_declaration and status=p_status and full_application_updates.note=v_note)
 then return;end if;
 update public.consultation_cases set application_status=p_status where user_id=applicant;
 insert into public.full_application_updates(user_id,declaration_id,status,note)
 values(applicant,p_declaration,p_status,v_note) returning id into update_id;
 insert into public.audit_logs(actor_id,action,entity_id,metadata)
 values(auth.uid(),'application.form_reviewed',p_declaration,jsonb_build_object('status',p_status));
 perform private.notify_case_owner_with_details(applicant,'full_application_review',update_id,
   jsonb_build_object('status',label,'nextStep',v_note));
 perform private.queue_admin_event_with_details('application.reviewed',update_id,
   jsonb_build_object('applicationId',p_declaration,'userId',applicant,'status',label));
end $$;

revoke all on function private.unlock_paid_application(),private.has_paid_application(uuid),private.guard_paid_application()
 from public,anon,authenticated;

create or replace function private.payment_owner_update() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.payment_status is distinct from new.payment_status then
   perform private.notify_case_owner_with_details(new.user_id,'payment_update',gen_random_uuid(),
     jsonb_build_object('status',case new.payment_status when 'verified' then 'Verified'
       when 'rejected' then 'Rejected' when 'pending_verification' then 'Pending verification' else 'Awaiting receipt' end,
       'nextStep',case new.payment_status when 'verified' then 'ISG will contact you on WhatsApp.'
       when 'rejected' then 'Read the receipt feedback and upload a replacement.'
       else 'Open Consultations for payment details.' end));
 end if;
 return new;
end $$;
