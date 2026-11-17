create function public.consume_rate_limit(p_key text, p_limit integer, p_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare current_count integer;
begin
  if length(p_key)>200 or p_limit<1 or p_seconds<1 then raise exception 'Invalid limit'; end if;
  insert into private.rate_limits(key,count,window_start) values(p_key,1,now())
    on conflict(key) do update set
      count=case when private.rate_limits.window_start < now()-make_interval(secs=>p_seconds) then 1 else private.rate_limits.count+1 end,
      window_start=case when private.rate_limits.window_start < now()-make_interval(secs=>p_seconds) then now() else private.rate_limits.window_start end
    returning count into current_count;
  delete from private.rate_limits where window_start<now()-interval '2 days';
  return current_count<=p_limit;
end $$;

create function public.submit_assessment(p_data jsonb, p_key uuid, p_hash text, p_team_email text default '') returns text
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
  if p_data->>'processingConsent'<>'true' or p_data->>'adultConfirmation'<>'true' then raise exception 'Consent required'; end if;
  insert into public.eligibility_assessments(email,first_name,last_name,phone,nationality,residence,qualification,education_status,
    field_of_study,performance,graduation_year,english_status,study_level,preferred_fields,destinations,intake,funding,constraints_note,idempotency_key,payload_hash)
  values(lower(p_data->>'email'),p_data->>'firstName',p_data->>'lastName',p_data->>'phone',p_data->>'nationality',p_data->>'residence',
    p_data->>'qualification',p_data->>'educationStatus',p_data->>'fieldOfStudy',p_data->>'performance',(p_data->>'graduationYear')::integer,
    p_data->>'englishStatus',p_data->>'studyLevel',p_data->>'preferredFields',p_data->>'destinations',p_data->>'intake',p_data->>'funding',p_data->>'constraints',p_key,p_hash)
  returning * into assessment;
  insert into public.leads(assessment_id) values(assessment.id);
  insert into public.consent_records(assessment_id,purpose,granted) values
    (assessment.id,'assessment_processing',true),(assessment.id,'adult_confirmation',true),(assessment.id,'marketing',(p_data->>'marketingConsent')::boolean);
  insert into private.notification_outbox(assessment_id,event,recipient,payload,dedupe_key)
    values(assessment.id,'assessment_received',assessment.email,jsonb_build_object('firstName',assessment.first_name,'reference',assessment.reference),assessment.id||':confirmation');
  if p_team_email<>'' then
    insert into private.notification_outbox(assessment_id,event,recipient,payload,dedupe_key)
      values(assessment.id,'team_assessment',p_team_email,jsonb_build_object('reference',assessment.reference),assessment.id||':team');
  end if;
  insert into public.audit_logs(action,entity_id) values('assessment.created',assessment.id);
  return assessment.reference;
end $$;

create function public.submit_enquiry(p_data jsonb, p_key uuid, p_hash text, p_team_email text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare record_id uuid; existing_hash text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select id,payload_hash into record_id,existing_hash from public.contact_enquiries where idempotency_key=p_key;
  if found then
    if existing_hash<>p_hash then raise exception 'Idempotency mismatch'; end if;
    return record_id;
  end if;
  insert into public.contact_enquiries(name,email,topic,message,idempotency_key,payload_hash)
    values(p_data->>'name',p_data->>'email',p_data->>'topic',p_data->>'message',p_key,p_hash) returning id into record_id;
  if p_team_email<>'' then
    insert into private.notification_outbox(event,recipient,payload,dedupe_key)
      values('team_enquiry',p_team_email,jsonb_build_object('reference',record_id::text),record_id||':team_enquiry');
  end if;
  return record_id;
end $$;
revoke all on function public.consume_rate_limit(text,integer,integer), public.submit_assessment(jsonb,uuid,text,text), public.submit_enquiry(jsonb,uuid,text,text) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer), public.submit_assessment(jsonb,uuid,text,text), public.submit_enquiry(jsonb,uuid,text,text) to service_role;
