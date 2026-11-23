begin;
select set_config('test.flow_user','00000000-0000-4000-8000-000000000903',true);
select set_config('test.new_package',(select id::text from private.opportunities where name='New package fixture' limit 1),true);
select set_config('test.full_data',(select data::text from public.application_declarations limit 1),true);
select set_config('test.flow_admin','00000000-0000-4000-8000-000000000103',true);
insert into auth.users(id,email,email_confirmed_at) values(current_setting('test.flow_user')::uuid,'admin-receipt@example.invalid',now());
set local role service_role;
select public.submit_my_consultation((select data||'{"email":"admin-receipt@example.invalid"}'::jsonb from public.test_payload),
 gen_random_uuid(),'new-flow',current_setting('test.flow_user')::uuid,'');
reset role;
update private.integration_settings set whatsapp_group='123456789@g.us' where id;
insert into storage.objects(bucket_id,name) values
 ('case-files',current_setting('test.flow_user')||'/89000000-0000-4000-8000-000000000101.pdf'),
 ('case-files',current_setting('test.flow_user')||'/89000000-0000-4000-8000-000000000102.pdf');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_user'),'aal','aal1')::text,true);
do $$begin
 perform public.register_admin_payment_file(auth.uid(),'89000000-0000-4000-8000-000000000101',auth.uid()||'/89000000-0000-4000-8000-000000000101.pdf','application/pdf',100,repeat('a',64),null,'forged.pdf');
 raise exception 'Applicant impersonated an administrator';
exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_admin'),'aal','aal1')::text,true);
select public.register_admin_payment_file(current_setting('test.flow_user')::uuid,'89000000-0000-4000-8000-000000000101',current_setting('test.flow_user')||'/89000000-0000-4000-8000-000000000101.pdf','application/pdf',100,repeat('a',64),null,'Admin consultation receipt.pdf');
select public.test_assert((select payment_status='pending_verification' from public.consultation_cases where user_id=current_setting('test.flow_user')::uuid),'admin upload awaits verification');
select public.test_assert((select uploaded_by=auth.uid() and share_receipt from public.case_files where id='89000000-0000-4000-8000-000000000101'),'consultation receipt attributed and shared');
select public.test_assert((select actor_id=auth.uid() from public.audit_logs where entity_id='89000000-0000-4000-8000-000000000101' and action='case.file_uploaded'),'real staff actor in audit');
reset role;
select public.test_assert(exists(select 1 from private.integration_events where event='payment.receipt_received' and entity_id='89000000-0000-4000-8000-000000000101' and channel='whatsapp' and recipient='123456789@g.us' and payload->>'documentName'='Admin consultation receipt.pdf'),'WhatsApp event includes receipt filename');
set local role service_role;
select public.test_assert(exists(select 1 from public.whatsapp_receipt('89000000-0000-4000-8000-000000000101','123456789@g.us')),'authorized group can retrieve receipt attachment');
select public.test_assert(not exists(select 1 from public.whatsapp_receipt('89000000-0000-4000-8000-000000000101','999999999@g.us')),'other group cannot retrieve attachment');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_admin'),'aal','aal1')::text,true);
select public.review_payment_receipt('89000000-0000-4000-8000-000000000101',true,'');
select set_config('test.flow_application',public.propose_application(current_setting('test.flow_user')::uuid,current_setting('test.new_package')::uuid)::text,true);
select public.register_admin_payment_file(current_setting('test.flow_user')::uuid,'89000000-0000-4000-8000-000000000102',current_setting('test.flow_user')||'/89000000-0000-4000-8000-000000000102.pdf','application/pdf',100,repeat('a',64),current_setting('test.flow_application')::uuid,'Admin package receipt.pdf');
select public.test_assert((select uploaded_by=auth.uid() and share_receipt and application_id=current_setting('test.flow_application')::uuid from public.case_files where id='89000000-0000-4000-8000-000000000102'),'package receipt linked to correct user and application');
select public.test_assert((select package_state='pending_verification' from public.study_applications where id=current_setting('test.flow_application')::uuid),'package upload awaits verification');
select public.review_payment_receipt('89000000-0000-4000-8000-000000000102',true,'');
select public.test_assert((select completed_at is not null from public.consultation_cases where user_id=current_setting('test.flow_user')::uuid),'verification opens next stage');
do $$begin
 perform public.register_admin_payment_file('00000000-0000-4000-8000-000000000201','89000000-0000-4000-8000-000000000103','wrong.pdf','application/pdf',100,repeat('a',64),current_setting('test.flow_application')::uuid,'wrong.pdf');
 raise exception 'Receipt attached to another applicant';
exception when raise_exception then if sqlerrm<>'Application unavailable' then raise;end if;end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000202","aal":"aal1"}',true);
select public.test_assert(not exists(select 1 from public.case_files where id='89000000-0000-4000-8000-000000000102'),'other applicant cannot read receipt');
reset role;
update public.user_roles set role='advisor' where user_id='00000000-0000-4000-8000-000000000102';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","aal":"aal1"}',true);
do $$begin
 perform public.register_admin_payment_file(current_setting('test.flow_user')::uuid,'89000000-0000-4000-8000-000000000103','wrong.pdf','application/pdf',100,repeat('a',64),null,'wrong.pdf');
 raise exception 'Advisor uploaded an admin-only payment receipt';
exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
rollback;
