begin;
select set_config('test.flow_user','00000000-0000-4000-8000-000000000902',true);
select set_config('test.new_package',(select id::text from private.opportunities where name='New package fixture' limit 1),true);
select set_config('test.full_data',(select data::text from public.application_declarations limit 1),true);
select set_config('test.flow_admin','00000000-0000-4000-8000-000000000103',true);
insert into auth.users(id,email,email_confirmed_at) values(current_setting('test.flow_user')::uuid,'staff-entry@example.invalid',now());
set local role service_role;
select public.submit_my_consultation((select data||'{"email":"staff-entry@example.invalid"}'::jsonb from public.test_payload),
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
 perform public.save_application_form('{"email":"staff-entry@example.invalid"}',false);
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
insert into storage.objects(bucket_id,name) values('case-files',current_setting('test.flow_user')||'/81000000-0000-4000-8000-000000000092.pdf');
set local role service_role;
select public.register_uploaded_case_file(current_setting('test.flow_user')::uuid,'81000000-0000-4000-8000-000000000092',
 'receipt','package_payment',current_setting('test.flow_user')||'/81000000-0000-4000-8000-000000000092.pdf',
 'application/pdf',100,repeat('a',64),current_setting('test.flow_application')::uuid,false,'Package receipt.pdf');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_admin'),'aal','aal1')::text,true);
select public.review_payment_receipt('81000000-0000-4000-8000-000000000092',true,'');
select public.test_assert((select completed_at is not null from public.consultation_cases where user_id=current_setting('test.flow_user')::uuid),'package verification unlocks form');
select set_config('test.staff_data',(current_setting('test.full_data')::jsonb||'{"guardianDob":"1975-05-04"}')::text,true);
select public.save_staff_application(current_setting('test.flow_user')::uuid,
 current_setting('test.staff_data')::jsonb||'{"email":"staff-entry@example.invalid","guardianDob":""}',false);
do $$begin
 perform public.save_staff_application(current_setting('test.flow_user')::uuid,
   current_setting('test.staff_data')::jsonb||'{"email":"staff-entry@example.invalid","guardianDob":""}',true);
 raise exception 'Final submission accepted without date of birth';
exception when check_violation then
 if sqlerrm not like '%application_declarations_guardian_dob_required%' then raise;end if;
end $$;
select set_config('test.staff_declaration',public.save_staff_application(current_setting('test.flow_user')::uuid,current_setting('test.staff_data')::jsonb||'{"email":"staff-entry@example.invalid"}',true)::text,true);
select public.test_assert((select submission_method='staff' and submitted_by=current_setting('test.flow_admin')::uuid from public.application_declarations where id=current_setting('test.staff_declaration')::uuid),'staff provenance is stored');
select public.test_assert(public.save_staff_application(current_setting('test.flow_user')::uuid,current_setting('test.staff_data')::jsonb||'{"email":"staff-entry@example.invalid"}',true)::text=current_setting('test.staff_declaration'),'staff submission retry is idempotent');
select public.save_staff_application(current_setting('test.flow_user')::uuid,current_setting('test.staff_data')::jsonb||'{"email":"application-contact@example.invalid"}',false);
select public.test_assert((select data->>'email'='application-contact@example.invalid' from public.application_form_drafts where user_id=current_setting('test.flow_user')::uuid),'staff can save an independent application contact email');
select public.test_assert(public.staff_application_email(current_setting('test.flow_user')::uuid)='staff-entry@example.invalid','saving the form keeps the original account email');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_user'),'aal','aal1')::text,true);
do $$begin
 perform public.save_staff_application(current_setting('test.flow_user')::uuid,current_setting('test.staff_data')::jsonb,false);
 raise exception 'Applicant used staff entry point';
exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
do $$begin
 perform private.save_application_data(auth.uid(),current_setting('test.staff_data')::jsonb,false,true);
 raise exception 'Private validation helper exposed';
exception when insufficient_privilege then null;end $$;
reset role;
update public.user_roles set role='advisor' where user_id='00000000-0000-4000-8000-000000000102';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","aal":"aal1"}',true);
do $$begin
 perform public.save_staff_application(current_setting('test.flow_user')::uuid,current_setting('test.staff_data')::jsonb,false);
 raise exception 'Unassigned advisor changed applicant';
exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
reset role;
update public.leads set advisor_id='00000000-0000-4000-8000-000000000102' where id=(select lead_id from public.consultation_cases where user_id=current_setting('test.flow_user')::uuid);
insert into storage.objects(bucket_id,name) values('case-files',current_setting('test.flow_user')||'/81000000-0000-4000-8000-000000000093.pdf');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","aal":"aal1"}',true);
select public.save_staff_application(current_setting('test.flow_user')::uuid,current_setting('test.staff_data')::jsonb||'{"email":"staff-entry@example.invalid","institutionName":"Advisor entered college"}',true);
select public.register_staff_application_file(current_setting('test.flow_user')::uuid,'81000000-0000-4000-8000-000000000093','certificates',current_setting('test.flow_user')||'/81000000-0000-4000-8000-000000000093.pdf','application/pdf',100,repeat('a',64),'Staff certificate.pdf');
select public.test_assert((select uploaded_by=auth.uid() from public.case_files where id='81000000-0000-4000-8000-000000000093'),'staff file author is stored');
reset role;
select public.test_assert((select actor_id='00000000-0000-4000-8000-000000000102' from public.audit_logs where entity_id='81000000-0000-4000-8000-000000000093' and action='case.file_uploaded'),'staff file audit has actual actor');
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.flow_admin'),'aal','aal1')::text,true);
select public.review_full_application((select current_declaration_id from public.consultation_cases where user_id=current_setting('test.flow_user')::uuid),'submitted','accepted','');
do $$begin
 perform public.save_staff_application(current_setting('test.flow_user')::uuid,current_setting('test.staff_data')::jsonb||'{"email":"staff-entry@example.invalid"}',false);
 raise exception 'Staff edited a closed application';
exception when raise_exception then if sqlerrm<>'Application review is closed' then raise;end if;end $$;
rollback;
