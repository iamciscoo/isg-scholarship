-- Older clients may still send an explicit age confirmation. New consultations omit it.
create or replace function public.submit_assessment(p_data jsonb, p_key uuid, p_hash text, p_team_email text default '') returns text
language plpgsql security definer set search_path = '' as $$
declare assessment public.eligibility_assessments; existing_hash text;
begin
  -- Serialize retries before checking the unique key, so concurrent requests share a result.
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select * into assessment from public.eligibility_assessments where idempotency_key=p_key;
  if found then
    if assessment.payload_hash<>p_hash then raise exception 'Idempotency mismatch'; end if;
    return assessment.reference;
  end if;
  if p_data->>'processingConsent' is distinct from 'true' then raise exception 'Consent required'; end if;
  insert into public.eligibility_assessments(email,first_name,last_name,phone,nationality,residence,qualification,education_status,
    field_of_study,performance,graduation_year,english_status,study_level,preferred_fields,destinations,intake,funding,constraints_note,idempotency_key,payload_hash)
  values(lower(p_data->>'email'),p_data->>'firstName',p_data->>'lastName',p_data->>'phone',p_data->>'nationality',p_data->>'residence',
    p_data->>'qualification',p_data->>'educationStatus',p_data->>'fieldOfStudy',p_data->>'performance',nullif(p_data->>'graduationYear','')::integer,
    p_data->>'englishStatus',p_data->>'studyLevel',p_data->>'preferredFields',p_data->>'destinations',p_data->>'intake',p_data->>'funding',p_data->>'constraints',p_key,p_hash)
  returning * into assessment;
  insert into public.leads(assessment_id) values(assessment.id);
  insert into public.consent_records(assessment_id,purpose,granted) values
    (assessment.id,'assessment_processing',true),(assessment.id,'marketing',(p_data->>'marketingConsent')::boolean);
  if p_data->>'adultConfirmation'='true' then
    insert into public.consent_records(assessment_id,purpose,granted) values (assessment.id,'adult_confirmation',true);
  end if;
  insert into private.notification_outbox(assessment_id,event,recipient,payload,dedupe_key)
    values(assessment.id,'assessment_received',assessment.email,jsonb_build_object('firstName',assessment.first_name,'reference',assessment.reference),assessment.id||':confirmation');
  if p_team_email<>'' then
    insert into private.notification_outbox(assessment_id,event,recipient,payload,dedupe_key)
      values(assessment.id,'team_assessment',p_team_email,jsonb_build_object('reference',assessment.reference),assessment.id||':team');
  end if;
  insert into public.audit_logs(action,entity_id) values('assessment.created',assessment.id);
  return assessment.reference;
end $$;

-- Application contact details are stored in drafts and declarations, separately from auth.users.
create or replace function private.save_application_data(p_user uuid,p_data jsonb,p_declare boolean,p_staff boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;digest text;key text;value text;field_length integer;
 email_pattern constant text := $pattern$^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$pattern$ || '$';
begin
 if not private.active_user() or p_user is null or p_declare is null then raise exception 'Access denied';end if;
 if p_staff then
  if not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(p_user) then raise exception 'Access denied';end if;
 elsif p_user is distinct from auth.uid() then raise exception 'Access denied';end if;
 perform 1 from public.consultation_cases where user_id=p_user for update;
 if not private.has_paid_application(p_user) then raise exception 'Application locked';end if;
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
 if ((p_declare or coalesce(p_data->>'email','')<>'') and coalesce(p_data->>'email','') !~ email_pattern)
  or (coalesce(p_data->>'guardianEmail','')<>'' and p_data->>'guardianEmail' !~ email_pattern) then raise exception 'Invalid email';end if;
 if coalesce(p_data->>'graduationYear','')<>'' and p_data->>'graduationYear' !~ '^(19[5-9][0-9]|20[0-9]{2})$' then raise exception 'Invalid graduation year';end if;
 if p_data ? 'maritalStatus' and p_data->>'maritalStatus'<>all(array['','Single','Married','Divorced','Widowed','Prefer not to say']) then raise exception 'Invalid marital status';end if;
 if coalesce(p_data->>'guardianDob','')<>'' then
  if p_data->>'guardianDob' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid guardian date';end if;
  begin perform (p_data->>'guardianDob')::date;
  exception when datetime_field_overflow or invalid_datetime_format then raise exception 'Invalid guardian date';end;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,16));
 insert into public.application_form_drafts(user_id,data) values(p_user,p_data) on conflict(user_id) do update set data=excluded.data,updated_at=now();
 if p_declare then
  foreach key in array array['firstName','lastName','phone','studyInterest','programme','residence','cityStreet','highestEducation','institutionName','institutionCountry','graduationYear','guardianFirstName','guardianLastName','guardianPhone','guardianRelation'] loop
   if coalesce(length(trim(p_data->>key)),0)=0 then raise exception 'Complete required fields';end if;
  end loop;
  if p_data->'guardianPermission' is distinct from 'true'::jsonb then raise exception 'Guardian permission required';end if;
  digest:=encode(extensions.digest(p_data::text,'sha256'),'hex');
  select d.id into result from public.consultation_cases c join public.application_declarations d on d.id=c.current_declaration_id and d.user_id=c.user_id where c.user_id=p_user and d.snapshot_hash=digest;
  if result is not null then return result;end if;
  insert into public.application_declarations(user_id,version,data,snapshot_hash,submitted_by,submission_method) values(p_user,'2026-11-18-application-v1',p_data,digest,auth.uid(),case when p_staff then 'staff' else 'applicant' end) returning id into result;
  update public.consultation_cases set current_declaration_id=result where user_id=p_user;
  insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),case when p_staff then 'application.staff_submitted' else 'application.declaration_accepted' end,result);
  perform private.queue_admin_event('application.form_received',result);
 end if;
 if p_staff and not p_declare then
  insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'application.staff_draft_saved',p_user);
 end if;return result;
end $$;
