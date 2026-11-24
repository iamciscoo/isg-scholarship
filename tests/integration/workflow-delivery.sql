begin;
update private.integration_settings set whatsapp_group='123456789@g.us' where id;
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000904','registration@example.invalid','{"full_name":"Sample Student"}');
update auth.users set email_confirmed_at=now() where id='00000000-0000-4000-8000-000000000904';
select public.test_assert((
 select count(*)=1 and bool_and(payload->>'registeredEmail'='registration@example.invalid'
  and payload->>'applicantName'='Sample Student' and payload->>'status'='Awaiting email confirmation')
 from private.integration_events where event='account.created'
 and entity_id='00000000-0000-4000-8000-000000000904' and channel='whatsapp'
),'registration captures email and initial status without duplicate alerts');
set local role service_role;
select public.submit_my_consultation((select data||'{"email":"registration@example.invalid"}'::jsonb from public.test_payload),
 gen_random_uuid(),'workflow-delivery','00000000-0000-4000-8000-000000000904','');
reset role;
update public.leads set stage='under_review' where assessment_id in
 (select id from public.eligibility_assessments where applicant_id='00000000-0000-4000-8000-000000000904');
update public.leads set stage='under_review' where assessment_id in
 (select id from public.eligibility_assessments where applicant_id='00000000-0000-4000-8000-000000000904');
select public.test_assert((
 select count(*)=1 and bool_and(payload->>'status'='Under review' and payload->>'path'='/dashboard/consultations')
 from private.notification_outbox where event='consultation_stage_update' and recipient='registration@example.invalid'
),'changing the consultation status queues one applicant email');
update private.notification_outbox set last_error='resend_http_403'
 where event='consultation_stage_update' and recipient='registration@example.invalid';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000904","role":"authenticated"}',true);
do $$begin
 perform public.notification_delivery_failures();
 raise exception 'Applicant read delivery diagnostics';
exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}',true);
select public.test_assert(exists(
 select 1 from public.notification_delivery_failures() where channel='Applicant email' and error='resend_http_403'
),'administrator can review aggregate failures');
rollback;
