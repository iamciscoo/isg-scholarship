-- Admin uploads use the same receipt review and notification path as applicant uploads.
create or replace function public.register_uploaded_case_file(
 p_user uuid,p_id uuid,p_kind text,p_category text,p_path text,p_mime text,p_bytes integer,p_hash text,
 p_application uuid,p_share_receipt boolean,p_name text
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;name text:=left(coalesce(btrim(p_name),''),180);
begin
 result:=public.register_payment_file(p_user,p_id,p_kind,p_category,p_path,p_mime,p_bytes,p_hash,p_application,p_share_receipt);
 update public.case_files set original_name=name where id=result;
 update private.integration_events set payload=payload||jsonb_build_object('documentName',name)
 where entity_id=result and event in ('payment.receipt_received','application.document_received');
 return result;
end $$;

create function public.register_admin_payment_file(
 p_user uuid,p_id uuid,p_path text,p_mime text,p_bytes integer,p_hash text,p_application uuid,p_name text
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;share boolean:=true;package_name text;
begin
 if not private.has_role(array['admin']::public.staff_role[]) or not private.can_access_case(p_user)
 then raise exception 'Access denied';end if;
 if p_application is not null then
  select proposal->>'name' into package_name from public.study_applications where id=p_application and user_id=p_user;
  if not found then raise exception 'Application unavailable';end if;
  share:=left(package_name,length('Preview test · '))<>'Preview test · ';
 end if;
 result:=public.register_uploaded_case_file(p_user,p_id,'receipt',
   case when p_application is null then 'payment_receipt' else 'package_payment' end,
   p_path,p_mime,p_bytes,p_hash,p_application,share,p_name);
 update public.case_files set uploaded_by=auth.uid() where id=result;
 update public.audit_logs set actor_id=auth.uid(),metadata=metadata||jsonb_build_object('onBehalfOf',p_user)
 where entity_id=result and action='case.file_uploaded';
 return result;
end $$;
revoke all on function public.register_admin_payment_file(uuid,uuid,text,text,integer,text,uuid,text)
 from public,anon,authenticated;
grant execute on function public.register_admin_payment_file(uuid,uuid,text,text,integer,text,uuid,text) to authenticated;
