begin;
select public.test_assert((select workflow_event='owner:full_application_information' and resolved_at is not null
 from public.account_notifications where workflow_entity='89000000-0000-4000-8000-000000000401'),'legacy information request backfilled as resolved');
select public.test_assert((select workflow_event='owner:full_application_submitted' and resolved_at is null
 from public.account_notifications where workflow_entity='89000000-0000-4000-8000-000000000402'),'latest legacy update remains unread');
select public.test_assert((select workflow_event is null and resolved_at is null
 from public.account_notifications where title='Legacy manual note'),'legacy manual notice untouched by backfill');
select set_config('test.notice_user','00000000-0000-4000-8000-000000000904',true);
select set_config('test.notice_admin','00000000-0000-4000-8000-000000000103',true);
select set_config('test.notice_package',(select id::text from private.opportunities where name='New package fixture' limit 1),true);
insert into auth.users(id,email,email_confirmed_at) values(current_setting('test.notice_user')::uuid,'notice-resolution@example.invalid',now());
set local role service_role;
select public.submit_my_consultation((select data||'{"email":"notice-resolution@example.invalid"}'::jsonb from public.test_payload),
 gen_random_uuid(),'notice-resolution',current_setting('test.notice_user')::uuid,'');
reset role;
select public.test_assert(exists(select 1 from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_event='owner:consultation.received' and resolved_at is null),'initial consultation upload prompt unread');
insert into storage.objects(bucket_id,name) values('case-files',current_setting('test.notice_user')||'/89000000-0000-4000-8000-000000000201.pdf');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_admin'),'aal','aal1')::text,true);
select public.register_admin_payment_file(current_setting('test.notice_user')::uuid,'89000000-0000-4000-8000-000000000201',
 current_setting('test.notice_user')||'/89000000-0000-4000-8000-000000000201.pdf','application/pdf',100,repeat('a',64),null,'Receipt.pdf');
reset role;
select public.test_assert(not exists(select 1 from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_event='owner:consultation.received' and resolved_at is null),'receipt submission resolves initial upload prompt');
select public.test_assert(exists(select 1 from public.account_notifications where workflow_event='staff:payment.receipt_received'
 and workflow_entity='89000000-0000-4000-8000-000000000201' and resolved_at is null),'receipt review prompt remains unread before review');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_admin'),'aal','aal1')::text,true);
select public.review_payment_receipt('89000000-0000-4000-8000-000000000201',false,'Please send a clearer receipt.');
reset role;
select public.test_assert(exists(select 1 from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and title='New consultation receipt needed' and resolved_at is null),'newest consultation rejection remains unread while replacement is needed');
select set_config('test.rejected_notice',(select id::text from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and title='New consultation receipt needed' and resolved_at is null limit 1),true);
insert into storage.objects(bucket_id,name) values('case-files',current_setting('test.notice_user')||'/89000000-0000-4000-8000-000000000204.pdf');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_admin'),'aal','aal1')::text,true);
select public.register_admin_payment_file(current_setting('test.notice_user')::uuid,'89000000-0000-4000-8000-000000000204',
 current_setting('test.notice_user')||'/89000000-0000-4000-8000-000000000204.pdf','application/pdf',100,repeat('a',64),null,'Clearer receipt.pdf');
reset role;
select public.test_assert((select resolved_at is not null from public.account_notifications where id=current_setting('test.rejected_notice')::uuid),'replacement upload resolves rejected consultation receipt prompt');
select private.resolve_completed_workflow_notices(current_setting('test.notice_user')::uuid);
select public.test_assert(not exists(select 1 from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_context='consultation-payment:'||current_setting('test.notice_user') and resolved_at is null),'pending consultation upload prompts are fulfilled');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_admin'),'aal','aal1')::text,true);
select public.review_payment_receipt('89000000-0000-4000-8000-000000000204',true,'');
reset role;
select private.resolve_completed_workflow_notices(current_setting('test.notice_user')::uuid);
select public.test_assert(exists(select 1 from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and title='Consultation receipt approved' and resolved_at is null),'new consultation approval remains unread after state resolution');
select public.test_assert(not exists(select 1 from public.account_notifications where workflow_event='staff:payment.receipt_received'
 and workflow_entity='89000000-0000-4000-8000-000000000201' and resolved_at is null),'review resolves all administrators receipt prompts');
select public.test_assert(exists(select 1 from public.account_notifications where workflow_event='staff:payment.reviewed'
 and workflow_entity='89000000-0000-4000-8000-000000000201' and resolved_at is null),'new receipt outcome remains unread');

-- Identical links do not resolve unrelated tasks or staff-authored announcements.
insert into public.account_notifications(title,body,link,recipient_id,author_id,request_id)
values('Keep this announcement','A manually authored message.','/dashboard/application',current_setting('test.notice_user')::uuid,current_setting('test.notice_admin')::uuid,gen_random_uuid());
select private.notify_case_owner_with_details(current_setting('test.notice_user')::uuid,'full_application_review','89000000-0000-4000-8000-000000000301','{"status":"Information requested"}');
select private.notify_case_owner_with_details(current_setting('test.notice_user')::uuid,'full_application_submitted','89000000-0000-4000-8000-000000000302','{"status":"Submitted"}');
select public.test_assert((select resolved_at is not null from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_entity='89000000-0000-4000-8000-000000000301'),'new application submission resolves earlier information request');
select public.test_assert((select resolved_at is null from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_entity='89000000-0000-4000-8000-000000000302'),'latest submitted application update unread');
select private.notify_case_owner_with_details(current_setting('test.notice_user')::uuid,'full_application_review','89000000-0000-4000-8000-000000000301','{"status":"Information requested"}');
select public.test_assert((select resolved_at is null from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_entity='89000000-0000-4000-8000-000000000302'),'replayed old dedupe key cannot read newest request');
select public.test_assert((select workflow_event is null and resolved_at is null from public.account_notifications where title='Keep this announcement'),'manual announcement unchanged');
select public.test_assert(exists(select 1 from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_event='owner:payment_update' and resolved_at is null),'unrelated payment outcome is not resolved by application update');

-- Package assignment prompts disappear only when the assigned package receipt is submitted.
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_admin'),'aal','aal1')::text,true);
select set_config('test.notice_application',public.propose_application(current_setting('test.notice_user')::uuid,
 current_setting('test.notice_package')::uuid)::text,true);
reset role;
select public.test_assert(exists(select 1 from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_event='owner:package_recommended' and resolved_at is null),'assigned package payment prompt unread');
insert into storage.objects(bucket_id,name) values('case-files',current_setting('test.notice_user')||'/89000000-0000-4000-8000-000000000202.pdf');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_admin'),'aal','aal1')::text,true);
select public.register_admin_payment_file(current_setting('test.notice_user')::uuid,'89000000-0000-4000-8000-000000000202',
 current_setting('test.notice_user')||'/89000000-0000-4000-8000-000000000202.pdf','application/pdf',100,repeat('a',64),current_setting('test.notice_application')::uuid,'Package receipt.pdf');
reset role;
select public.test_assert(not exists(select 1 from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_event='owner:package_recommended' and resolved_at is null),'package receipt resolves payment prompt');

-- An uploaded document resolves only its own category; reviewing it keeps the new feedback unread.
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_admin'),'aal','aal1')::text,true);
select public.review_payment_receipt('89000000-0000-4000-8000-000000000202',true,'');
select public.set_document_request(current_setting('test.notice_user')::uuid,'achievements','Achievement certificates',false,'Upload certificates.');
select public.set_document_request(current_setting('test.notice_user')::uuid,'other','Other supporting documents',false,'Upload another document.');
reset role;
insert into storage.objects(bucket_id,name) values('case-files',current_setting('test.notice_user')||'/89000000-0000-4000-8000-000000000203.pdf');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_admin'),'aal','aal1')::text,true);
select public.register_staff_application_file(current_setting('test.notice_user')::uuid,'89000000-0000-4000-8000-000000000203','achievements',
 current_setting('test.notice_user')||'/89000000-0000-4000-8000-000000000203.pdf','application/pdf',100,repeat('a',64),'Award.pdf');
reset role;
select public.test_assert(not exists(select 1 from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_context='document:'||current_setting('test.notice_user')||':achievements' and resolved_at is null),'upload resolves its document request');
select public.test_assert(exists(select 1 from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_context='document:'||current_setting('test.notice_user')||':other' and resolved_at is null),'another document request stays unread despite same link');
select private.queue_admin_event_with_details('application.document_received','89000000-0000-4000-8000-000000000203','{}');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_admin'),'aal','aal1')::text,true);
select public.review_application_document('89000000-0000-4000-8000-000000000203',false,'Please send the complete certificate.');
reset role;
select public.test_assert(not exists(select 1 from public.account_notifications where workflow_event='staff:application.document_received'
 and workflow_entity='89000000-0000-4000-8000-000000000203' and resolved_at is null),'review resolves staff document task');
select public.test_assert(exists(select 1 from public.account_notifications where recipient_id=current_setting('test.notice_user')::uuid
 and workflow_context='document:'||current_setting('test.notice_user')||':achievements'
 and workflow_event='owner:document_update' and resolved_at is null),'new correction request stays unread');

set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.notice_user'),'aal','aal1')::text,true);
select public.test_assert((select (item->>'is_read')::boolean and (item->>'is_system')::boolean
 from jsonb_array_elements(public.account_notification_inbox()->'items') item where item->>'title'='Consultation received'),'resolved history remains visible and system-labelled');
select public.test_assert((select not (item->>'is_read')::boolean and not (item->>'is_system')::boolean
 from jsonb_array_elements(public.account_notification_inbox()->'items') item where item->>'title'='Keep this announcement'),'manual notice stays unread and is not system translated');
select public.test_assert((public.account_notification_inbox()->>'unread')::bigint=(
 select count(*) from public.account_notifications n where (n.recipient_id is null or n.recipient_id=auth.uid()) and n.resolved_at is null
 and not exists(select 1 from public.notification_reads r where r.notification_id=n.id and r.user_id=auth.uid())),'inbox count excludes resolved updates');
reset role;
rollback;
