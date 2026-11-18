create table public.application_form_drafts(
 user_id uuid primary key references public.consultation_cases on delete cascade,
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<=24000),updated_at timestamptz not null default now()
);
create table public.application_declarations(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.consultation_cases on delete cascade,
 version text not null check(version='2026-11-18-application-v1'),data jsonb not null,
 snapshot_hash text not null,accepted_at timestamptz not null default now()
);
alter table public.consultation_cases add column current_declaration_id uuid references public.application_declarations(id) on delete set null;
create table public.document_requests(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.consultation_cases on delete cascade,
 category text not null check(category in('passport','certificates','transcripts','photo','other')),
 label text not null check(length(label) between 1 and 160),required boolean not null default true,note text not null default '' check(length(note)<=1000),
 created_by uuid references public.profiles,created_at timestamptz not null default now(),unique(user_id,category)
);
alter table public.application_form_drafts enable row level security;
alter table public.application_declarations enable row level security;
alter table public.document_requests enable row level security;
revoke all on public.application_form_drafts,public.application_declarations,public.document_requests from public,anon,authenticated;
grant select on public.application_form_drafts,public.application_declarations,public.document_requests to authenticated;
create policy form_draft_read on public.application_form_drafts for select to authenticated using(private.can_access_case(user_id));
create policy declarations_read on public.application_declarations for select to authenticated using(private.can_access_case(user_id));
create policy document_requests_read on public.document_requests for select to authenticated using(private.can_access_case(user_id));
create function private.request_initial_documents() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.completed_at is null and new.completed_at is not null then
  insert into public.document_requests(user_id,category,label) values(new.user_id,'passport','Passport'),(new.user_id,'certificates','Education certificates'),(new.user_id,'transcripts','Academic transcripts'),(new.user_id,'photo','Passport-size photograph') on conflict do nothing;
 end if;return new;
end $$;
create trigger request_initial_documents after update of completed_at on public.consultation_cases for each row execute function private.request_initial_documents();
create function public.save_application_form(p_data jsonb,p_declare boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;digest text;key text;value text;field_length integer;
 email_pattern constant text := $pattern$^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$pattern$ || '$';
begin
 if not private.active_user() or not exists(select 1 from public.consultation_cases where user_id=auth.uid() and payment_status='verified' and completed_at is not null) then raise exception 'Application locked';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>24000 then raise exception 'Invalid form';end if;
 if p_declare then
  p_data:=jsonb_build_object('middleName','','poBox','','institutionCity','','institutionStreet','','maritalStatus','','guardianMiddleName','','guardianDob','','guardianEmail','')||p_data;
 end if;
 for key in select jsonb_object_keys(p_data) loop
  if key<>all(array['firstName','middleName','lastName','email','phone','studyInterest','programme','poBox','residence','cityStreet','highestEducation','institutionName','institutionCountry','institutionCity','institutionStreet','graduationYear','maritalStatus','guardianFirstName','guardianMiddleName','guardianLastName','guardianDob','guardianPhone','guardianEmail','guardianRelation','guardianPermission']) then raise exception 'Unexpected form field';end if;
  if key='guardianPermission' then
   if jsonb_typeof(p_data->key) is distinct from 'boolean' then raise exception 'Invalid guardian permission';end if;
  else
   if jsonb_typeof(p_data->key) is distinct from 'string' then raise exception 'Invalid field';end if;
   value:=p_data->>key;
   if key<>all(array['email','guardianEmail','guardianDob','graduationYear','maritalStatus']) then
    value:=btrim(value,E' \t\n\r\f\013'||U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
    p_data:=jsonb_set(p_data,array[key],to_jsonb(value));
   end if;
   -- Zod string limits count UTF-16 units, including two for astral characters.
   select coalesce(sum(case when ascii(c)>65535 then 2 else 1 end),0) into field_length from regexp_split_to_table(value,'') as chars(c) where c<>'';
   if field_length>(case when key in('email','guardianEmail') then 254 else 160 end) then raise exception 'Invalid field';end if;
  end if;
 end loop;
 if p_data->>'email' is distinct from (select email from auth.users where id=auth.uid()) then raise exception 'Use account email';end if;
 if p_data->>'email' !~ email_pattern or (coalesce(p_data->>'guardianEmail','')<>'' and p_data->>'guardianEmail' !~ email_pattern) then raise exception 'Invalid email';end if;
 if coalesce(p_data->>'graduationYear','')<>'' and p_data->>'graduationYear' !~ '^(19[5-9][0-9]|20[0-9]{2})$' then raise exception 'Invalid graduation year';end if;
 if p_data ? 'maritalStatus' and p_data->>'maritalStatus'<>all(array['','Single','Married','Divorced','Widowed','Prefer not to say']) then raise exception 'Invalid marital status';end if;
 if coalesce(p_data->>'guardianDob','')<>'' then
  if p_data->>'guardianDob' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid guardian date';end if;
  begin perform (p_data->>'guardianDob')::date;
  exception when datetime_field_overflow or invalid_datetime_format then raise exception 'Invalid guardian date';end;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,16));
 insert into public.application_form_drafts(user_id,data) values(auth.uid(),p_data) on conflict(user_id) do update set data=excluded.data,updated_at=now();
 if p_declare then
  foreach key in array array['firstName','lastName','phone','studyInterest','programme','residence','cityStreet','highestEducation','institutionName','institutionCountry','graduationYear','guardianFirstName','guardianLastName','guardianPhone','guardianRelation'] loop
   if coalesce(length(trim(p_data->>key)),0)=0 then raise exception 'Complete required fields';end if;
  end loop;
  if p_data->'guardianPermission' is distinct from 'true'::jsonb then raise exception 'Guardian permission required';end if;
  digest:=encode(extensions.digest(p_data::text,'sha256'),'hex');
  select d.id into result from public.consultation_cases c join public.application_declarations d on d.id=c.current_declaration_id and d.user_id=c.user_id where c.user_id=auth.uid() and d.snapshot_hash=digest;
  if result is not null then return result;end if;
  insert into public.application_declarations(user_id,version,data,snapshot_hash) values(auth.uid(),'2026-11-18-application-v1',p_data,digest) returning id into result;
  update public.consultation_cases set current_declaration_id=result where user_id=auth.uid();
  insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'application.declaration_accepted',result);
  perform private.queue_admin_event('application.form_received',result);
 end if;return result;
end $$;
create function public.set_document_request(p_user uuid,p_category text,p_label text,p_required boolean,p_note text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(p_user) then raise exception 'Access denied';end if;
 insert into public.document_requests(user_id,category,label,required,note,created_by) values(p_user,p_category,p_label,p_required,p_note,auth.uid()) on conflict(user_id,category) do update set label=excluded.label,required=excluded.required,note=excluded.note,created_by=auth.uid();
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'document.requested',p_user);
 perform private.notify_case_owner(p_user,'document_request',gen_random_uuid());
end $$;
create function public.review_application_document(p_file uuid,p_approve boolean,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare f public.case_files;
begin
 select * into f from public.case_files where id=p_file and kind='document' for update;
 if not found or not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(f.user_id) then raise exception 'Access denied';end if;
 if length(trim(p_note))<3 or length(p_note)>1000 then raise exception 'Review note required';end if;
 update public.case_files set review_status=case when p_approve then 'approved' else 'rejected' end,review_note=trim(p_note),reviewed_by=auth.uid(),reviewed_at=now() where id=p_file;
 insert into public.audit_logs(actor_id,action,entity_id,metadata) values(auth.uid(),'document.reviewed',p_file,jsonb_build_object('approved',p_approve));
 perform private.notify_case_owner(f.user_id,'document_update',gen_random_uuid());
end $$;
revoke all on function private.request_initial_documents(),public.save_application_form(jsonb,boolean),public.set_document_request(uuid,text,text,boolean,text),public.review_application_document(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.save_application_form(jsonb,boolean),public.set_document_request(uuid,text,text,boolean,text),public.review_application_document(uuid,boolean,text) to authenticated;
