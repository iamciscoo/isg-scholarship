-- All identities/messages in this file are disposable database fixtures.
set role service_role;
select public.submit_enquiry('{"name":"Disposable enquirer","email":"fixture@example.invalid","topic":"Consultation","message":"Disposable private enquiry text","consent":true}', '90000000-0000-4000-8000-000000000020','test','') as enquiry_id \gset
reset role;
select public.test_assert((select count(*)>0 from public.account_notifications where link='/admin/enquiries' and title='New advisor enquiry'),'enquiry creates admin portal messages');
select public.test_assert(not exists(select 1 from public.account_notifications where body like '%fixture@example.invalid%' or body like '%Disposable private enquiry text%'),'staff bell messages exclude contact content');
select count(*) as before_retry from public.account_notifications where link='/admin/enquiries' \gset
set role service_role;
select public.submit_enquiry('{"name":"Disposable enquirer","email":"fixture@example.invalid","topic":"Consultation","message":"Disposable private enquiry text","consent":true}', '90000000-0000-4000-8000-000000000020','test','');
reset role;
select private.queue_admin_event('enquiry.received',:'enquiry_id');
select public.test_assert((select count(*)=:before_retry from public.account_notifications where link='/admin/enquiries'),'staff events deduplicate per admin');
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000201"}',false);
select public.test_assert(not exists(select 1 from public.account_notifications where link like '/admin/%'),'applicants cannot read staff messages');
reset role;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103"}',false);
select public.test_assert((public.account_notification_inbox()->>'unread')::integer>0,'active admin has real unread messages');
select public.read_account_notifications();
select public.test_assert((public.account_notification_inbox()->>'unread')::integer=0,'admin mark-all clears unread counter');
reset role;
select public.test_assert(not has_function_privilege('authenticated','private.enquiry_staff_event()','execute'),'browsers cannot forge staff events');
select public.test_assert((select hero_image like '%.webp' or hero_image like '/api/marketing-images/%' from public.site_presentation),'stored homepage reference is webp');
select 'STAFF INBOX AND WEBP PASSED' as result;
