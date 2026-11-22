begin;
select set_config('test.flow_user','00000000-0000-4000-8000-000000000901',true);
select set_config('test.new_package',(select id::text from private.opportunities where name='New package fixture' limit 1),true);
select set_config('test.full_data',(select data::text from public.application_declarations limit 1),true);
select set_config('test.flow_admin','00000000-0000-4000-8000-000000000103',true);
insert into auth.users(id,email,email_confirmed_at) values(current_setting('test.flow_user')::uuid,'admin-flow@example.invalid',now());
set local role service_role;
select public.submit_my_consultation((select data||'{"email":"admin-flow@example.invalid"}'::jsonb from public.test_payload),
 gen_random_uuid(),'new-flow',current_setting('test.flow_user')::uuid,'');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_admin'),'aal','aal1')::text,true);
do $$begin
 perform public.propose_application(current_setting('test.flow_user')::uuid,current_setting('test.new_package')::uuid);
 raise exception 'Unpaid consultation assigned a package';
exception when raise_exception then if sqlerrm<>'Verify consultation payment first' then raise;end if;end $$;
reset role;
update public.consultation_cases set payment_status='verified',verified_at=now() where user_id=current_setting('test.flow_user')::uuid;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_admin'),'aal','aal1')::text,true);
select set_config('test.flow_application',public.propose_application(current_setting('test.flow_user')::uuid,current_setting('test.new_package')::uuid)::text,true);
select public.test_assert(public.propose_application(current_setting('test.flow_user')::uuid,current_setting('test.new_package')::uuid)::text=current_setting('test.flow_application'),'assignment retry is safe');
select public.test_assert((select approval='approved' and package_state='awaiting_receipt' from public.study_applications where id=current_setting('test.flow_application')::uuid),'assignment immediately opens package payment');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_user'),'aal','aal1')::text,true);
do $$begin
 perform public.save_application_form('{"email":"admin-flow@example.invalid"}',false);
 raise exception 'Unpaid package opened form';
exception when raise_exception then if sqlerrm<>'Application locked' then raise;end if;end $$;
do $$begin
 perform public.request_whatsapp_call(auth.uid(),'Stale browser');
 raise exception 'Retired call entry still available';
exception when insufficient_privilege then null;end $$;
do $$begin
 perform public.select_scholarship_package(current_setting('test.new_package')::uuid);
 raise exception 'Applicant assigned own package';
exception when insufficient_privilege then null;end $$;
reset role;
insert into storage.objects(bucket_id,name) values('case-files',current_setting('test.flow_user')||'/81000000-0000-4000-8000-000000000091.pdf');
set local role service_role;
select public.register_uploaded_case_file(current_setting('test.flow_user')::uuid,'81000000-0000-4000-8000-000000000091',
 'receipt','package_payment',current_setting('test.flow_user')||'/81000000-0000-4000-8000-000000000091.pdf',
 'application/pdf',100,repeat('a',64),current_setting('test.flow_application')::uuid,false,'Package receipt.pdf');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_admin'),'aal','aal1')::text,true);
select public.review_payment_receipt('81000000-0000-4000-8000-000000000091',true,'');
select public.test_assert((select completed_at is not null from public.consultation_cases where user_id=current_setting('test.flow_user')::uuid),'package verification unlocks form');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_user'),'aal','aal1')::text,true);
select set_config('test.flow_declaration',public.save_application_form(current_setting('test.full_data')::jsonb||'{"email":"admin-flow@example.invalid"}'::jsonb,true)::text,true);
do $$begin
 perform public.review_full_application(current_setting('test.flow_declaration')::uuid,'submitted','accepted','');
 raise exception 'Applicant changed tracking status';
exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_admin'),'aal','aal1')::text,true);
select public.review_full_application(current_setting('test.flow_declaration')::uuid,'submitted','applying','');
select public.review_full_application(current_setting('test.flow_declaration')::uuid,'applying','accepted','');
select public.test_assert((select application_status='accepted' from public.consultation_cases where user_id=current_setting('test.flow_user')::uuid),'admin updates only the status without provider fields or per-document approval');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_user'),'aal','aal1')::text,true);
do $$begin
 perform public.save_application_form(current_setting('test.full_data')::jsonb||'{"email":"admin-flow@example.invalid","programme":"Stale edit"}'::jsonb,true);
 raise exception 'Closed application was edited';
exception when raise_exception then if sqlerrm<>'Application review is closed' then raise;end if;end $$;
rollback;
