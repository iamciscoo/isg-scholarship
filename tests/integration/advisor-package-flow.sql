select set_config('test.student','00000000-0000-4000-8000-000000000201',false);
select set_config('test.other','00000000-0000-4000-8000-000000000202',false);
select set_config('test.admin','00000000-0000-4000-8000-000000000103',false);
select set_config('test.advisor','00000000-0000-4000-8000-000000000102',false);
select set_config('test.consultation_receipt','81000000-0000-4000-8000-000000000010',false);
select set_config('test.package_receipt','81000000-0000-4000-8000-000000000011',false);
select set_config('test.replacement_receipt','81000000-0000-4000-8000-000000000012',false);
select set_config('test.staff_group','123456789@g.us',false);
update private.integration_settings set whatsapp_group=current_setting('test.staff_group') where id;
update public.consultation_cases set payment_status='awaiting_receipt',verified_at=null,verified_by=null
where user_id=current_setting('test.student')::uuid;

set role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'aal','aal1')::text,false);
do $$begin perform public.assign_consultation_advisor(current_setting('test.student')::uuid,current_setting('test.advisor')::uuid); raise exception 'Assigned before payment';exception when raise_exception then if sqlerrm<>'Verify consultation payment first' then raise;end if;end $$;
select set_config('test.new_package',public.save_scholarship_package(null,'{"name":"New package fixture","provider":"Test university","destination":"Test destination","studyLevel":"Undergraduate","field":"Computing","requirements":"","deadline":"","supportSummary":"Test guidance","packageFee":125000,"providerFee":"","providerCurrency":"TZS","image":"/images/study-1.webp","active":true}',null)::text,false);
select public.save_package_payment_instructions('Test-only payment instructions for the full package amount');

select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student'),'aal','aal1')::text,false);
select public.test_assert((select count(*)=1 from public.browse_scholarship_packages()),'can browse after consultation submission');
select set_config('test.new_app',public.select_scholarship_package(current_setting('test.new_package')::uuid)::text,false);
select public.test_assert(public.select_scholarship_package(current_setting('test.new_package')::uuid)::text=current_setting('test.new_app'),'interest is retry-safe');
do $$begin perform public.approve_application(current_setting('test.new_app')::uuid,true);raise exception 'Interest converted without advisor';exception when raise_exception then if sqlerrm<>'Advisor recommendation required' then raise;end if;end $$;
reset role;
insert into storage.objects(bucket_id,name) select 'case-files',current_setting('test.student')||'/'||id||'.webp'
from unnest(array[current_setting('test.consultation_receipt'),current_setting('test.package_receipt'),current_setting('test.replacement_receipt')]) ids(id);
set role service_role;
select public.register_payment_file(current_setting('test.student')::uuid,current_setting('test.consultation_receipt')::uuid,'receipt','payment_receipt',
 current_setting('test.student')||'/'||current_setting('test.consultation_receipt')||'.webp','image/webp',100,repeat('a',64),null,true);
select public.test_assert((select count(*)=1 from public.whatsapp_receipt(current_setting('test.consultation_receipt')::uuid,current_setting('test.staff_group'))),'authorized redacted consultation receipt can be sent');
select public.test_assert((select count(*)=0 from public.whatsapp_receipt(current_setting('test.consultation_receipt')::uuid,'999@g.us')),'receipt is limited to configured group');
reset role;

set role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'aal','aal1')::text,false);
select public.review_payment_receipt(current_setting('test.consultation_receipt')::uuid,true,'');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student'),'aal','aal1')::text,false);
do $$begin perform public.request_consultation_meeting('Test request');raise exception 'Unassigned meeting request permitted';exception when raise_exception then if sqlerrm<>'Advisor assignment required' then raise;end if;end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'aal','aal1')::text,false);
select public.assign_consultation_advisor(current_setting('test.student')::uuid,current_setting('test.advisor')::uuid);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student'),'aal','aal1')::text,false);
select public.request_consultation_meeting('Test availability');
select public.send_consultation_message(auth.uid(),'Interested in the test package');

select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.advisor'),'aal','aal1')::text,false);
select public.test_assert(public.propose_application(current_setting('test.student')::uuid,current_setting('test.new_package')::uuid)::text=current_setting('test.new_app'),'recommendation reuses saved interest');
do $$begin perform public.update_study_application(current_setting('test.new_app')::uuid,'Applying','Pending',null,'','Test update','',null);raise exception 'Unpaid application started';exception when raise_exception then if sqlerrm<>'Verified package payment and advisor assignment required' then raise;end if;end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.student'),'aal','aal1')::text,false);
select public.approve_application(current_setting('test.new_app')::uuid,true);
select public.test_assert((select package_state='awaiting_receipt' and proposal->>'packageFee'='125000' from public.study_applications where id=current_setting('test.new_app')::uuid),'confirmation exposes full package fee');
select public.test_assert(public.package_payment_instructions(current_setting('test.new_app')::uuid) like 'Test-only%','owner can read approved package payment instructions');
reset role;

set role service_role;
select public.register_payment_file(current_setting('test.student')::uuid,current_setting('test.package_receipt')::uuid,'receipt','package_payment',
 current_setting('test.student')||'/'||current_setting('test.package_receipt')||'.webp','image/webp',100,repeat('b',64),current_setting('test.new_app')::uuid,false);
select public.test_assert((select count(*)=0 from public.whatsapp_receipt(current_setting('test.package_receipt')::uuid,current_setting('test.staff_group'))),'private receipt without permission is not disclosed');
reset role;
set role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.advisor'),'aal','aal1')::text,false);
do $$begin perform public.review_payment_receipt(current_setting('test.package_receipt')::uuid,true,'');raise exception 'Advisor reviewed payment';exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'aal','aal1')::text,false);
select public.review_payment_receipt(current_setting('test.package_receipt')::uuid,false,'');
reset role;
set role service_role;
select public.register_payment_file(current_setting('test.student')::uuid,current_setting('test.replacement_receipt')::uuid,'receipt','package_payment',
 current_setting('test.student')||'/'||current_setting('test.replacement_receipt')||'.webp','image/webp',100,repeat('c',64),current_setting('test.new_app')::uuid,true);
reset role;
set role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'aal','aal1')::text,false);
select public.review_payment_receipt(current_setting('test.replacement_receipt')::uuid,true,'');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.advisor'),'aal','aal1')::text,false);
select public.update_study_application(current_setting('test.new_app')::uuid,'Applying','Pending',null,'','Started after full payment','',null);
select public.test_assert((select package_state='paid' and status='Applying' from public.study_applications where id=current_setting('test.new_app')::uuid),'assigned advisor can start after verification');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.other'),'aal','aal1')::text,false);
select public.test_assert((select count(*)=0 from public.case_files),'unrelated applicant sees no receipts');
reset role;
