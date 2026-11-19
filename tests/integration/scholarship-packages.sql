begin;
select public.test_assert((select not public from storage.buckets where id='scholarship-images'),'package images use a private bucket');
insert into storage.objects(bucket_id,name) values('scholarship-images','81000000-0000-4000-8000-000000000001.webp');

set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","aal":"aal1"}',false);
select public.assign_staff_role('00000000-0000-4000-8000-000000000202','advisor');
select public.test_assert((select role='advisor' from public.staff_accounts() where id='00000000-0000-4000-8000-000000000202'),'team settings reads the saved role after a change');
select public.assign_staff_role('00000000-0000-4000-8000-000000000202','applicant');
select set_config('test.scholarship_data','{"name":"Private scholarship","provider":"University fixture","destination":"Test destination","studyLevel":"Master''s","field":"Engineering","requirements":"Test requirements","deadline":"","supportSummary":"Application guidance","packageFee":40000,"providerFee":"25","providerCurrency":"USD","image":"/images/study-1.webp","active":true}',false);
select set_config('test.scholarship',public.save_scholarship_package(null,current_setting('test.scholarship_data')::jsonb,'81000000-0000-4000-8000-000000000001')::text,false);
select public.test_assert((select source_url is null and research_notes='' and package_fee_tzs=40000 from public.admin_opportunities() where id=current_setting('test.scholarship')::uuid),'package saves without notes or source URL and allows fee below consultation');
select public.test_assert(public.can_read_scholarship_image('81000000-0000-4000-8000-000000000001'),'admin can read saved image');
select public.test_assert((select count(*)=1 from public.staff_opportunity_choices()),'legacy unpriced opportunities are hidden from sharing');
select set_config('test.new_application',public.propose_application('00000000-0000-4000-8000-000000000201',current_setting('test.scholarship')::uuid)::text,false);
select public.save_scholarship_package(current_setting('test.scholarship')::uuid,current_setting('test.scholarship_data')::jsonb || '{"packageFee":90000,"useGallery":true}',null);

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000201","aal":"aal1"}',false);
select public.test_assert((select proposal->'packageFee'='40000'::jsonb and proposal->'providerFee'='25'::jsonb and proposal->>'providerCurrency'='USD' and proposal->>'supportSummary'='Application guidance' and not proposal ? 'sourceUrl' from public.study_applications where id=current_setting('test.new_application')::uuid),'application freezes the full package fee and separate provider fees');
select public.test_assert(public.can_read_scholarship_image('81000000-0000-4000-8000-000000000001'),'applicant keeps access to the application snapshot image after package edit');
select public.approve_application(current_setting('test.new_application')::uuid,true);
select public.test_assert((select approval='approved' from public.study_applications where id=current_setting('test.new_application')::uuid),'package and fee can be approved through existing application flow');
select public.test_assert((select count(*)=1 and max(remaining_tzs)=250000 from public.service_orders),'approval leaves the previously accepted quote intact and creates no new credit order');
do $$begin perform public.accept_service_package(current_setting('test.package')::uuid,now());raise exception 'Old credit order still writable';exception when insufficient_privilege then null;end $$;
do $$begin perform public.save_scholarship_package(null,current_setting('test.scholarship_data')::jsonb,null);raise exception 'Applicant saved private package';exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000202","aal":"aal1"}',false);
select public.test_assert(not public.can_read_scholarship_image('81000000-0000-4000-8000-000000000001'),'another applicant cannot read the package image');
reset role;
set role anon;
do $$begin perform public.can_read_scholarship_image('81000000-0000-4000-8000-000000000001');raise exception 'Anonymous image access allowed';exception when insufficient_privilege then null;end $$;
reset role;
rollback;
