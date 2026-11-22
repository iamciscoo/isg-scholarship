-- Review is tracked independently of scholarship package and provider decisions.
alter table public.consultation_cases add column application_status text
  check (application_status in ('submitted','in_review','needs_information','approved','declined'));
update public.consultation_cases set application_status='submitted' where current_declaration_id is not null;
alter table public.consultation_cases add constraint full_application_status_matches_submission
  check ((current_declaration_id is null)=(application_status is null));

create table public.full_application_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.consultation_cases on delete cascade,
  declaration_id uuid not null references public.application_declarations on delete cascade,
  status text not null check (status in ('submitted','in_review','needs_information','approved','declined')),
  note text not null check (length(note) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp()
);
create index full_application_updates_recent on public.full_application_updates(user_id,created_at desc,id desc);
alter table public.full_application_updates enable row level security;
revoke all on public.full_application_updates from public,anon,authenticated;
grant select on public.full_application_updates to authenticated;
create policy full_application_updates_read on public.full_application_updates for select to authenticated
  using (private.can_access_case(user_id));

create view public.full_application_queue with (security_invoker=true) as
select c.user_id,d.id,c.application_status as status,d.accepted_at,
  concat_ws(' ',nullif(d.data->>'firstName',''),nullif(d.data->>'lastName','')) as applicant,
  d.data->>'programme' as programme
from public.consultation_cases c join public.application_declarations d on d.id=c.current_declaration_id;
revoke all on public.full_application_queue from public,anon,authenticated;
grant select on public.full_application_queue to authenticated;

insert into public.full_application_updates(user_id,declaration_id,status,note,created_at)
select user_id,id,'submitted','Application submitted for ISG review.',accepted_at
from public.application_declarations;

create function private.record_full_application_submission() returns trigger
language plpgsql security definer set search_path='' as $$
declare update_id uuid;
begin
  if new.current_declaration_id is not distinct from old.current_declaration_id then return new; end if;
  if new.current_declaration_id is null then
    new.application_status := null;
    return new;
  end if;
  if old.application_status in ('approved','declined') then raise exception 'Application review is closed'; end if;
  new.application_status := 'submitted';
  insert into public.full_application_updates(user_id,declaration_id,status,note)
  values(new.user_id,new.current_declaration_id,'submitted','Application submitted for ISG review.')
  returning id into update_id;
  perform private.notify_case_owner_with_details(new.user_id,'full_application_submitted',update_id,
    jsonb_build_object('applicationId',new.current_declaration_id,'status','Submitted'));
  return new;
end $$;
create trigger record_full_application_submission before update of current_declaration_id on public.consultation_cases
  for each row execute function private.record_full_application_submission();

create function public.review_full_application(p_declaration uuid,p_previous_status text,p_status text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare applicant uuid; c public.consultation_cases; update_id uuid; display_status text;
begin
  select user_id into applicant from public.application_declarations where id=p_declaration;
  if applicant is null or not private.has_role(array['admin','advisor']::public.staff_role[])
    or not private.can_access_case(applicant) then raise exception 'Access denied'; end if;
  select * into c from public.consultation_cases where user_id=applicant for update;
  if not found or c.current_declaration_id is distinct from p_declaration
    or c.application_status is distinct from p_previous_status then raise exception 'Application changed'; end if;
  if p_note is null or length(trim(p_note)) not between 3 and 2000 or p_status is null
    or (p_status<>'submitted' and p_status not in ('in_review','needs_information','approved','declined'))
    or (p_status='submitted' and c.application_status<>'submitted') then raise exception 'Invalid update'; end if;
  if p_status='approved' and exists (
    select 1 from public.document_requests r where r.user_id=applicant and r.required
      and not exists(select 1 from public.case_files f where f.user_id=applicant and f.kind='document'
        and f.category=r.category and f.review_status='approved')
  ) then raise exception 'Required documents need approval'; end if;
  if p_status=c.application_status and exists (
    select 1 from (select note from public.full_application_updates where user_id=applicant
      order by created_at desc,id desc limit 1) latest where latest.note=trim(p_note)
  ) then return; end if;
  display_status:=case p_status when 'in_review' then 'In review' when 'needs_information' then 'Information requested'
    when 'approved' then 'Approved by ISG' when 'declined' then 'Declined by ISG' else 'Submitted' end;
  update public.consultation_cases set application_status=p_status where user_id=applicant;
  insert into public.full_application_updates(user_id,declaration_id,status,note)
  values(applicant,p_declaration,p_status,trim(p_note)) returning id into update_id;
  insert into public.audit_logs(actor_id,action,entity_id,metadata)
  values(auth.uid(),'application.form_reviewed',p_declaration,jsonb_build_object('status',p_status));
  perform private.notify_case_owner_with_details(applicant,
    case p_status when 'needs_information' then 'full_application_information' else 'full_application_review' end,
    update_id,jsonb_build_object('applicationId',p_declaration,'status',display_status,'nextStep',trim(p_note)));
  perform private.queue_admin_event_with_details('application.reviewed',update_id,
    jsonb_build_object('applicationId',p_declaration,'userId',applicant,'status',display_status));
end $$;

create function public.respond_to_full_application(p_declaration uuid,p_note text) returns void
language plpgsql security definer set search_path='' as $$
declare c public.consultation_cases; update_id uuid;
begin
  if not private.active_user() then raise exception 'Access denied'; end if;
  select * into c from public.consultation_cases where user_id=auth.uid() for update;
  if not found or c.current_declaration_id is distinct from p_declaration or p_declaration is null
    or c.application_status<>'needs_information' then raise exception 'Information request is unavailable'; end if;
  if p_note is null or length(p_note)>2000 then raise exception 'Invalid response'; end if;
  if trim(p_note)='' and not exists (
    select 1 from public.case_files f where f.user_id=c.user_id and f.kind='document' and f.created_at >= (
      select max(created_at) from public.full_application_updates
      where user_id=c.user_id and declaration_id=p_declaration and status='needs_information'
    )
  ) then raise exception 'Attach a file or write a response'; end if;
  update public.consultation_cases set application_status='submitted' where user_id=c.user_id;
  insert into public.full_application_updates(user_id,declaration_id,status,note)
  values(c.user_id,p_declaration,'submitted',coalesce(nullif(trim(p_note),''),'Applicant sent the requested updates.'))
  returning id into update_id;
  perform private.notify_case_owner_with_details(c.user_id,'full_application_submitted',update_id,
    jsonb_build_object('applicationId',p_declaration,'status','Submitted'));
  perform private.queue_admin_event_with_details('application.information_received',update_id,
    jsonb_build_object('applicationId',p_declaration,'userId',c.user_id,'status','Submitted'));
end $$;
revoke all on function private.record_full_application_submission(),public.review_full_application(uuid,text,text,text),
  public.respond_to_full_application(uuid,text) from public,anon,authenticated;
grant execute on function public.review_full_application(uuid,text,text,text),public.respond_to_full_application(uuid,text)
  to authenticated;

alter table public.document_requests drop constraint document_requests_category_check;
alter table public.document_requests add constraint document_requests_category_check
  check (category in ('passport','certificates','transcripts','photo','achievements','other'));

insert into public.document_requests(user_id,category,label,required)
select c.user_id,d.category,d.label,false from public.consultation_cases c
cross join (values ('achievements','Achievement certificates'),('other','Other supporting documents')) d(category,label)
where c.completed_at is not null on conflict do nothing;

create or replace function private.request_initial_documents() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if old.completed_at is null and new.completed_at is not null then
    insert into public.document_requests(user_id,category,label,required) values
      (new.user_id,'passport','Passport',true),
      (new.user_id,'certificates','Education certificates',true),
      (new.user_id,'transcripts','Academic transcripts',true),
      (new.user_id,'photo','Passport-size photograph',true),
      (new.user_id,'achievements','Achievement certificates',false),
      (new.user_id,'other','Other supporting documents',false)
    on conflict do nothing;
  end if;
  return new;
end $$;

create or replace function public.set_document_request(p_user uuid,p_category text,p_label text,p_required boolean,p_note text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(p_user)
    or not exists(select 1 from public.consultation_cases where user_id=p_user and completed_at is not null)
  then raise exception 'Access denied'; end if;
  insert into public.document_requests(user_id,category,label,required,note,created_by)
  values(p_user,p_category,p_label,p_required,p_note,auth.uid()) on conflict(user_id,category) do update
    set label=excluded.label,required=excluded.required,note=excluded.note,created_by=auth.uid();
  insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'document.requested',p_user);
  perform private.notify_case_owner_with_details(p_user,'document_request',gen_random_uuid(),
    jsonb_build_object('documentName',p_label,'nextStep',nullif(trim(p_note),'')));
end $$;

create or replace function public.review_application_document(p_file uuid,p_approve boolean,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare f public.case_files; feedback text;
begin
  select * into f from public.case_files where id=p_file and kind='document' for update;
  if not found or not private.has_role(array['admin','advisor']::public.staff_role[])
    or not private.can_access_case(f.user_id) then raise exception 'Access denied'; end if;
  if p_approve is null or p_note is null or length(p_note)>1000
    or (not p_approve and length(trim(p_note))<3) then raise exception 'Review note required'; end if;
  feedback:=coalesce(nullif(trim(p_note),''),'Document approved.');
  if f.review_status=(case when p_approve then 'approved' else 'rejected' end)
    and f.review_note=feedback then return; end if;
  update public.case_files set review_status=case when p_approve then 'approved' else 'rejected' end,
    review_note=feedback,reviewed_by=auth.uid(),reviewed_at=now() where id=p_file;
  insert into public.audit_logs(actor_id,action,entity_id,metadata)
  values(auth.uid(),'document.reviewed',p_file,jsonb_build_object('approved',p_approve));
  perform private.notify_case_owner_with_details(f.user_id,'document_update',gen_random_uuid(),jsonb_build_object(
    'documentName',(select label from public.document_requests where user_id=f.user_id and category=f.category),
    'status',case when p_approve then 'Approved' else 'Correction requested' end,'nextStep',feedback));
end $$;
