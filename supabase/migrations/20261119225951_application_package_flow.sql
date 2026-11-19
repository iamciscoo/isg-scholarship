alter table public.study_applications add column package_state text check(package_state in (
  'interested','recommended','awaiting_receipt','pending_verification','receipt_rejected','paid'
));
create index study_applications_package_lookup on public.study_applications(user_id,opportunity_id,created_at desc);

create function private.scholarship_snapshot(o private.opportunities) returns jsonb
language sql stable set search_path='' as $$
  select jsonb_build_object('name',o.name,'provider',o.provider,'destination',o.destination,
    'studyLevel',o.study_level,'field',o.field,'requirements',o.requirements,'deadline',o.deadline,
    'providerFee',o.provider_fee,'providerCurrency',o.provider_currency,'packageFee',o.package_fee_tzs,
    'supportSummary',o.support_summary,'image',case when o.private_image_id is null then o.image
      else '/api/scholarship-images/'||o.private_image_id::text end);
$$;

create function public.browse_scholarship_packages()
returns table(id uuid,proposal jsonb)
language sql stable security definer set search_path='' as $$
  select o.id,private.scholarship_snapshot(o) from private.opportunities o
  where private.active_user() and exists(select 1 from public.consultation_cases where user_id=auth.uid())
    and o.active and o.package_fee_tzs is not null and (o.deadline is null or o.deadline>=current_date)
    and not exists (select 1 from public.study_applications a where a.user_id=auth.uid() and a.opportunity_id=o.id
      and a.status not in ('Cancelled','Rejected','Completed'))
  order by o.name,o.id;
$$;

create or replace function public.can_read_scholarship_image(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select (private.has_role(array['admin']::public.staff_role[]) and exists (
    select 1 from private.opportunities where private_image_id=p_id
  )) or exists (
    select 1 from public.study_applications a
    where a.proposal->>'image'='/api/scholarship-images/'||p_id::text and private.can_access_case(a.user_id)
  ) or (private.active_user() and exists (
    select 1 from public.consultation_cases where user_id=auth.uid()
  ) and exists (
    select 1 from private.opportunities where private_image_id=p_id and active and package_fee_tzs is not null
      and (deadline is null or deadline>=current_date)
  ));
$$;

create function private.save_applicant_package(p_user uuid,p_package uuid,p_recommend boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.study_applications; o private.opportunities; result uuid;
begin
  -- Serialize interest and recommendation on the same case, including simultaneous requests.
  perform 1 from public.consultation_cases where user_id=p_user for update;
  if not found then raise exception 'Consultation required'; end if;
  if p_recommend and not private.case_has_advisor(p_user) then raise exception 'Advisor assignment required'; end if;
  select * into o from private.opportunities where id=p_package and active and package_fee_tzs is not null
    and (deadline is null or deadline>=current_date);
  if not found then raise exception 'Package unavailable'; end if;
  select * into a from public.study_applications where user_id=p_user and opportunity_id=p_package
    and status not in ('Cancelled','Rejected','Completed') order by created_at desc,id limit 1 for update;
  if found then
    if not p_recommend or a.package_state is distinct from 'interested' then return a.id; end if;
    update public.study_applications set package_state='recommended',proposal=private.scholarship_snapshot(o),
      proposal_version=proposal_version+1,updated_at=now() where id=a.id returning id into result;
  else
    insert into public.study_applications(user_id,opportunity_id,proposal,package_state)
    values(p_user,p_package,private.scholarship_snapshot(o),case when p_recommend then 'recommended' else 'interested' end)
    returning id into result;
  end if;
  insert into public.study_application_history(application_id,actor_id,status,provider_decision,note)
  values(result,auth.uid(),'Starting','Not received',case when p_recommend
    then 'ISG recommended this package for your review.' else 'Applicant saved interest in this package.' end);
  if p_recommend then perform private.notify_case_owner(p_user,'package_recommended',result); end if;
  return result;
end $$;

create function public.select_scholarship_package(p_package uuid) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if not private.active_user() then raise exception 'Access denied'; end if;
  return private.save_applicant_package(auth.uid(),p_package,false);
end $$;

create or replace function public.propose_application(p_user uuid,p_opportunity uuid) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(p_user)
  then raise exception 'Access denied'; end if;
  return private.save_applicant_package(p_user,p_opportunity,true);
end $$;

create or replace function public.approve_application(p_application uuid,p_approve boolean) returns void
language plpgsql security definer set search_path='' as $$
declare a public.study_applications; declaration uuid; next_payment text;
begin
  select * into a from public.study_applications where id=p_application for update;
  if not found or not private.active_user() or a.user_id<>auth.uid() then raise exception 'Access denied'; end if;
  if p_approve is null or a.approval<>'pending' or a.status<>'Starting' then raise exception 'Already reviewed'; end if;
  next_payment:=a.package_state;
  if a.package_state is null then
    select current_declaration_id into declaration from public.consultation_cases where user_id=auth.uid();
    if p_approve and declaration is null then raise exception 'Submit application declaration first'; end if;
  else
    if p_approve and (a.package_state<>'recommended' or not private.case_has_advisor(a.user_id))
    then raise exception 'Advisor recommendation required'; end if;
    if p_approve then
      next_payment:=case when (a.proposal->>'packageFee')::integer=0 then 'paid' else 'awaiting_receipt' end;
    end if;
  end if;
  update public.study_applications set approval=case when p_approve then 'approved' else 'declined' end,
    approved_at=now(),declaration_id=case when p_approve then declaration end,
    status=case when p_approve then 'Starting' else 'Cancelled' end,package_state=next_payment,updated_at=now()
  where id=a.id;
  insert into public.study_application_history(application_id,actor_id,status,provider_decision,note)
  values(a.id,auth.uid(),case when p_approve then 'Starting' else 'Cancelled' end,a.provider_decision,
    case when p_approve then 'Applicant confirmed the package and its listed fees.' else 'Applicant declined this package.' end);
  perform private.queue_admin_event('application.updated',a.id);
end $$;

revoke all on function private.scholarship_snapshot(private.opportunities),private.save_applicant_package(uuid,uuid,boolean),
  public.browse_scholarship_packages(),public.select_scholarship_package(uuid) from public,anon,authenticated;
grant execute on function public.browse_scholarship_packages(),public.select_scholarship_package(uuid) to authenticated;

create or replace function public.update_study_application(p_application uuid,p_status text,p_decision text,p_decision_date date,p_evidence text,p_note text,p_next text,p_next_date date) returns void language plpgsql security definer set search_path='' as $$
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
 if p_decision in('Accepted','Rejected','Withdrawn') and (p_decision_date is null or p_decision_date>current_date or length(trim(p_evidence))<3) then raise exception 'Record official decision date and evidence';end if;
 if(p_status='Accepted' and p_decision<>'Accepted') or(p_status='Rejected' and p_decision<>'Rejected') then raise exception 'Official decision required';end if;
 if length(trim(p_note))<3 or length(p_note)>2000 then raise exception 'History note required';end if;
 update public.study_applications set status=p_status,provider_decision=p_decision,provider_decision_date=p_decision_date,provider_evidence=p_evidence,next_step=p_next,next_date=p_next_date,updated_at=now() where id=a.id;
 insert into public.study_application_history(application_id,actor_id,status,provider_decision,note) values(a.id,auth.uid(),p_status,p_decision,trim(p_note));
 perform private.notify_case_owner(a.user_id,'application_update',gen_random_uuid());perform private.queue_admin_event('application.updated',gen_random_uuid());
end $$;
