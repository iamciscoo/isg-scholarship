alter table public.case_files
  add column application_id uuid references public.study_applications on delete cascade,
  add column share_receipt boolean not null default false,
  add constraint case_file_receipt_only check(
    (application_id is null and not share_receipt) or kind='receipt'
  );
create index case_files_application on public.case_files(application_id) where application_id is not null;
alter table private.payment_instructions add column package_instructions text not null default ''
  check(length(package_instructions)<=5000);

create function public.package_payment_instructions(p_application uuid default null) returns text
language sql stable security definer set search_path='' as $$
  select package_instructions from private.payment_instructions where id
  and (private.has_role(array['admin']::public.staff_role[]) or exists(
    select 1 from public.study_applications a where a.id=p_application and a.user_id=auth.uid()
      and private.active_user() and a.approval='approved' and a.package_state in ('awaiting_receipt','receipt_rejected')
  ));
$$;

create function public.save_package_payment_instructions(p_instructions text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  update private.payment_instructions set package_instructions=trim(p_instructions),updated_at=now() where id;
  insert into public.audit_logs(actor_id,action) values(auth.uid(),'payment.instructions_changed');
end $$;
revoke all on function public.package_payment_instructions(uuid),public.save_package_payment_instructions(text)
  from public,anon,authenticated;
grant execute on function public.package_payment_instructions(uuid),public.save_package_payment_instructions(text)
  to authenticated;

create function public.register_payment_file(
  p_user uuid,p_id uuid,p_kind text,p_category text,p_path text,p_mime text,p_bytes integer,p_hash text,
  p_application uuid,p_share_receipt boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.study_applications; result uuid;
begin
  if p_application is null then
    result:=public.register_case_file(p_user,p_id,p_kind,p_category,p_path,p_mime,p_bytes,p_hash);
    if p_kind='receipt' and p_share_receipt then
      update public.case_files set share_receipt=true where id=result;
    end if;
    return result;
  end if;
  if p_kind<>'receipt' or not exists (select 1 from public.profiles where id=p_user and status='active')
  then raise exception 'Access denied'; end if;
  select * into a from public.study_applications where id=p_application and user_id=p_user for update;
  if not found or a.status<>'Starting' or a.approval<>'approved' or a.package_state is null
    or a.package_state not in ('awaiting_receipt','receipt_rejected') or not private.case_has_advisor(p_user)
  then raise exception 'Package payment not available'; end if;
  if p_path<>(p_user::text||'/'||p_id::text||case when p_mime='image/webp' then '.webp' else '.pdf' end)
    or not exists(select 1 from storage.objects where bucket_id='case-files' and name=p_path)
  then raise exception 'File unavailable'; end if;
  insert into public.case_files(id,user_id,kind,category,storage_path,mime,bytes,sha256,application_id,share_receipt)
  values(p_id,p_user,'receipt','package_payment',p_path,p_mime,p_bytes,p_hash,p_application,coalesce(p_share_receipt,false));
  update public.study_applications set package_state='pending_verification',updated_at=now() where id=a.id;
  perform private.queue_admin_event('payment.receipt_received',p_id);
  insert into public.audit_logs(actor_id,action,entity_id,metadata)
  values(p_user,'case.file_uploaded',p_id,jsonb_build_object('kind','package_receipt'));
  return p_id;
end $$;

create function public.review_payment_receipt(p_file uuid,p_approve boolean,p_feedback text)
returns void language plpgsql security definer set search_path='' as $$
declare f public.case_files; a public.study_applications; feedback text;
begin
  if not private.has_role(array['admin']::public.staff_role[]) or p_approve is null
  then raise exception 'Access denied'; end if;
  select * into f from public.case_files where id=p_file and kind='receipt';
  if not found then raise exception 'Receipt unavailable'; end if;
  feedback:=coalesce(nullif(trim(p_feedback),''),case when p_approve
    then 'Payment verified.' else 'Please upload a clearer receipt or contact ISG.' end);
  if length(feedback)>1000 then raise exception 'Feedback is too long'; end if;
  if f.application_id is null then
    perform public.review_consultation_payment(p_file,p_approve,feedback);
    return;
  end if;
  select * into a from public.study_applications where id=f.application_id and user_id=f.user_id for update;
  select * into f from public.case_files where id=p_file for update;
  if not found or f.review_status<>'pending' or a.package_state is distinct from 'pending_verification'
  then raise exception 'Already reviewed'; end if;
  update public.case_files set review_status=case when p_approve then 'approved' else 'rejected' end,
    review_note=feedback,reviewed_by=auth.uid(),reviewed_at=now() where id=p_file;
  update public.study_applications set package_state=case when p_approve then 'paid' else 'receipt_rejected' end,
    updated_at=now() where id=a.id;
  insert into public.study_application_history(application_id,actor_id,status,provider_decision,note)
  values(a.id,auth.uid(),a.status,a.provider_decision,feedback);
  insert into public.audit_logs(actor_id,action,entity_id,metadata)
  values(auth.uid(),'payment.reviewed',p_file,jsonb_build_object('approved',p_approve,'kind','package_receipt'));
  perform private.notify_case_owner(a.user_id,'package_payment_update',p_file);
  perform private.queue_admin_event('payment.reviewed',p_file);
end $$;

create function public.whatsapp_receipt(p_file uuid,p_group text) returns table(storage_path text,mime text)
language sql stable security definer set search_path='' as $$
  select f.storage_path,f.mime from public.case_files f
  join private.integration_settings s on s.id and s.whatsapp_group=p_group and p_group<>''
  where f.id=p_file and f.kind='receipt' and f.share_receipt;
$$;

revoke all on function public.register_payment_file(uuid,uuid,text,text,text,text,integer,text,uuid,boolean),
  public.review_payment_receipt(uuid,boolean,text),public.whatsapp_receipt(uuid,text) from public,anon,authenticated;
revoke execute on function public.review_consultation_payment(uuid,boolean,text) from authenticated;
grant execute on function public.review_payment_receipt(uuid,boolean,text) to authenticated;
grant execute on function public.register_payment_file(uuid,uuid,text,text,text,text,integer,text,uuid,boolean),
  public.whatsapp_receipt(uuid,text) to service_role;
