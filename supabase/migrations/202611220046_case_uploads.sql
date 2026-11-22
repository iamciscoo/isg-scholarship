alter table public.case_files drop constraint case_files_kind_check;
alter table public.case_files add constraint case_files_kind_check
  check(kind in ('receipt','document','support'));
alter table public.case_files add column original_name text not null default ''
  check(length(original_name)<=180);

alter policy case_file_read on public.case_files using (
  private.active_user() and (
    user_id=auth.uid()
    or (kind='receipt' and private.has_role(array['admin']::public.staff_role[]))
    or (kind in ('document','support') and private.can_access_case(user_id))
  )
);

create or replace function public.register_case_file(
  p_user uuid,p_id uuid,p_kind text,p_category text,p_path text,p_mime text,p_bytes integer,p_hash text
) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.consultation_cases;
begin
  select * into c from public.consultation_cases where user_id=p_user for update;
  if not found or not exists(select 1 from public.profiles where id=p_user and status='active')
  then raise exception 'Access denied'; end if;
  if p_path<>(p_user::text||'/'||p_id::text||case when p_mime='image/webp' then '.webp' else '.pdf' end)
  then raise exception 'Invalid path'; end if;
  if not exists(select 1 from storage.objects where bucket_id='case-files' and name=p_path)
  then raise exception 'File unavailable'; end if;
  if p_kind='receipt' and c.payment_status in ('verified','pending_verification')
  then raise exception 'Payment already submitted'; end if;
  if p_kind='support' and p_category is distinct from 'consultation_support'
  then raise exception 'Invalid consultation document category'; end if;
  if p_kind='document' then
    if c.completed_at is null or c.payment_status<>'verified'
    then raise exception 'Application locked'; end if;
    if not exists(select 1 from public.document_requests where user_id=p_user and category=p_category)
    then raise exception 'Document category unavailable'; end if;
  end if;

  insert into public.case_files(id,user_id,kind,category,storage_path,mime,bytes,sha256)
  values(p_id,p_user,p_kind,p_category,p_path,p_mime,p_bytes,p_hash);
  if p_kind='receipt' then
    update public.consultation_cases set payment_status='pending_verification' where user_id=p_user;
    perform private.queue_admin_event('payment.receipt_received',p_id);
  elsif p_kind='support' then
    perform private.queue_admin_event('consultation.support_received',p_id);
  elsif p_kind='document' and c.current_declaration_id is not null then
    perform private.queue_admin_event_with_details('application.document_received',p_id,
      jsonb_build_object('applicationId',c.current_declaration_id));
  end if;
  insert into public.audit_logs(actor_id,action,entity_id,metadata)
  values(p_user,'case.file_uploaded',p_id,jsonb_build_object('kind',p_kind));
  return p_id;
end $$;

create function public.register_uploaded_case_file(
  p_user uuid,p_id uuid,p_kind text,p_category text,p_path text,p_mime text,p_bytes integer,p_hash text,
  p_application uuid,p_share_receipt boolean,p_name text
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  result:=public.register_payment_file(
    p_user,p_id,p_kind,p_category,p_path,p_mime,p_bytes,p_hash,p_application,p_share_receipt
  );
  update public.case_files set original_name=left(coalesce(btrim(p_name),''),180) where id=result;
  return result;
end $$;

revoke all on function public.register_uploaded_case_file(uuid,uuid,text,text,text,text,integer,text,uuid,boolean,text)
  from public,anon,authenticated;
grant execute on function public.register_uploaded_case_file(uuid,uuid,text,text,text,text,integer,text,uuid,boolean,text)
  to service_role;
