begin;
update private.integration_settings
set admin_emails=array['alerts@example.invalid'],whatsapp_group='111111-222222@g.us' where id;
update private.integration_events set available_at=now()+interval '1 day' where state='pending';
update private.notification_outbox set available_at=now()+interval '1 day' where state='pending';

select private.queue_admin_event_with_details('application.reviewed','82000000-0000-4000-8000-000000000001',
  '{"applicantName":"Test Applicant","status":"Needs information","applicationId":"82000000-0000-4000-8000-000000000002"}');
select public.test_assert((
  select count(*)=2 and bool_and(payload->>'applicantName'='Test Applicant'
    and payload->>'path'='/admin/declarations/82000000-0000-4000-8000-000000000002'
    and payload->>'status'='Needs information')
  from private.integration_events where entity_id='82000000-0000-4000-8000-000000000001'
),'both staff channels include the reviewed application snapshot');

select id as admin_email,lease_id as email_lease from public.claim_integration_events(true,false)
where entity_id='82000000-0000-4000-8000-000000000001' \gset
select public.finish_integration_event(:'admin_email',:'email_lease',null,'pending','resend_http_429');
select public.test_assert((
  select state='pending' and available_at>now() and not delivery_uncertain
  from private.integration_events where id=:'admin_email'
),'a definitive email throttle gets a bounded retry');

select id as whatsapp,lease_id as whatsapp_lease from public.claim_integration_events(false,true)
where entity_id='82000000-0000-4000-8000-000000000001' \gset
update private.integration_events set lease_until=now()-interval '1 minute' where id=:'whatsapp';
select public.test_assert(not exists(
  select 1 from public.claim_integration_events(false,true) where id=:'whatsapp'
),'an ambiguous WhatsApp sends no duplicate');
select public.test_assert((select state='uncertain' from private.integration_events where id=:'whatsapp'),
  'interrupted WhatsApp delivery surfaces for review');

insert into private.notification_outbox(event,recipient,payload,dedupe_key)
values('assessment_received','applicant@example.invalid','{}','test:resend-retry')
returning id as applicant_email \gset
select lease_id as applicant_lease from public.claim_notifications(10) where id=:'applicant_email' \gset
select public.finish_notification(:'applicant_email',:'applicant_lease',null,'resend_unconfirmed');
update private.notification_outbox set first_attempt_at=now()-interval '23 hours 15 minutes',available_at=now()
where id=:'applicant_email';
select public.test_assert(not exists(select 1 from public.claim_notifications(10) where id=:'applicant_email'),
  'an ambiguous email is not resent after the safe idempotency window');
select public.test_assert((select state='failed' and last_error='resend_delivery_unconfirmed'
  from private.notification_outbox where id=:'applicant_email'),'late uncertainty is visible to staff');
rollback;
select 'NOTIFICATION DELIVERY PASSED' as result;
