create or replace function public.save_application_form(p_data jsonb,p_declare boolean default false)
returns uuid language sql security definer set search_path='' as $$
 select private.save_application_data(auth.uid(),p_data,p_declare,false);
$$;
create function public.save_staff_application(p_user uuid,p_data jsonb,p_submit boolean default false)
returns uuid language sql security definer set search_path='' as $$
 select private.save_application_data(p_user,p_data,p_submit,true);
$$;
revoke all on function private.save_application_data(uuid,jsonb,boolean,boolean),
 public.save_staff_application(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.save_staff_application(uuid,jsonb,boolean) to authenticated;

create function public.staff_application_email(p_user uuid) returns text
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(p_user)
 then raise exception 'Access denied';end if;
 return (select email from auth.users where id=p_user);
end $$;
revoke all on function public.staff_application_email(uuid) from public,anon,authenticated;
grant execute on function public.staff_application_email(uuid) to authenticated;

create or replace function private.guard_paid_application() returns trigger
language plpgsql security definer set search_path='' as $$
declare status text;staff boolean;
begin
 if tg_table_name='case_files' then
  if new.kind<>'document' then return new;end if;
 end if;
 select application_status into status from public.consultation_cases where user_id=new.user_id;
 staff:=private.has_role(array['admin','advisor']::public.staff_role[]) and private.can_access_case(new.user_id);
 if tg_table_name in ('application_declarations','application_form_drafts') and status is not null then
  if (staff and status in ('accepted','rejected','completed','cancelled','approved','declined'))
    or (not staff and status not in ('submitted','needs_information'))
  then raise exception 'Application review is closed';end if;
 end if;
 if not private.has_paid_application(new.user_id) then raise exception 'Verify package payment first';end if;
 return new;
end $$;

create function public.register_staff_application_file(
 p_user uuid,p_id uuid,p_category text,p_path text,p_mime text,p_bytes integer,p_hash text,p_name text
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(p_user)
 then raise exception 'Access denied';end if;
 if not private.has_paid_application(p_user) then raise exception 'Application locked';end if;
 result:=public.register_uploaded_case_file(p_user,p_id,'document',p_category,p_path,p_mime,p_bytes,p_hash,null,false,p_name);
 update public.case_files set uploaded_by=auth.uid() where id=result;
 update public.audit_logs set actor_id=auth.uid(),metadata=metadata||jsonb_build_object('onBehalfOf',p_user)
 where entity_id=result and action='case.file_uploaded';
 return result;
end $$;
revoke all on function public.register_staff_application_file(uuid,uuid,text,text,text,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.register_staff_application_file(uuid,uuid,text,text,text,integer,text,text) to authenticated;

create or replace function private.record_full_application_submission() returns trigger
language plpgsql security definer set search_path='' as $$
declare update_id uuid;staff boolean;
begin
 if new.current_declaration_id is not distinct from old.current_declaration_id then return new;end if;
 if new.current_declaration_id is null then new.application_status:=null;return new;end if;
 if old.application_status in ('approved','declined','accepted','rejected','completed','cancelled')
 then raise exception 'Application review is closed';end if;
 select submission_method='staff' into staff from public.application_declarations where id=new.current_declaration_id;
 new.application_status:='submitted';
 insert into public.full_application_updates(user_id,declaration_id,status,note)
 values(new.user_id,new.current_declaration_id,'submitted',case when staff
  then 'ISG recorded your application details for review.' else 'Application submitted for ISG review.' end)
 returning id into update_id;
 perform private.notify_case_owner_with_details(new.user_id,'full_application_submitted',update_id,
  jsonb_build_object('applicationId',new.current_declaration_id,'status','Submitted',
   'nextStep',case when staff then 'ISG recorded your application. Open it to check the details.' else 'ISG is reviewing your application.' end));
 return new;
end $$;
