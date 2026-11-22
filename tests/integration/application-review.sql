begin;
select set_config('test.review_student','00000000-0000-4000-8000-000000000201',true);
select set_config('test.review_admin','00000000-0000-4000-8000-000000000103',true);
select set_config('test.review_other','00000000-0000-4000-8000-000000000202',true);
select set_config('test.review_id',(select current_declaration_id::text from public.consultation_cases
  where user_id=current_setting('test.review_student')::uuid),true);
select set_config('test.review_old_id',(select id::text from public.application_declarations
  where user_id=current_setting('test.review_student')::uuid and id<>current_setting('test.review_id')::uuid limit 1),true);

set role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.review_admin'),'aal','aal1')::text,true);
select public.test_assert(exists(select 1 from public.full_application_queue
  where id=current_setting('test.review_id')::uuid and status='submitted' and programme is not null),'existing submission is in the review queue');
select public.test_assert((select count(*)=2 from public.document_requests
  where user_id=current_setting('test.review_student')::uuid and category in ('achievements','other') and not required),'existing unlocked cases get optional upload categories');
do $$begin
  perform public.review_full_application(current_setting('test.review_old_id')::uuid,'submitted','in_review','Reviewing an earlier signed copy');
  raise exception 'Superseded declaration was updated';
exception when raise_exception then if sqlerrm<>'Application changed' then raise;end if;end $$;

select public.set_document_request(current_setting('test.review_student')::uuid,'achievements','Award certificates',true,'Send clear scans of both awards.');
do $$begin
  perform public.review_full_application(current_setting('test.review_id')::uuid,'submitted','approved','Application is ready for provider review');
  raise exception 'Application approved with missing documents';
exception when raise_exception then if sqlerrm<>'Required documents need approval' then raise;end if;end $$;
select public.review_full_application(current_setting('test.review_id')::uuid,'submitted','needs_information','Please add both award certificates.');

select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.review_student'),'aal','aal1')::text,true);
do $$begin
  perform public.respond_to_full_application(current_setting('test.review_id')::uuid,'');
  raise exception 'Empty corrections accepted';
exception when raise_exception then if sqlerrm<>'Attach a file or write a response' then raise;end if;end $$;

select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.review_other'),'aal','aal1')::text,true);
select public.test_assert((select count(*)=0 from public.full_application_updates),'unrelated applicant cannot read review updates');
select public.test_assert((select count(*)=0 from public.full_application_queue),'unrelated applicant cannot read review queue entries');
do $$begin
  perform public.respond_to_full_application(current_setting('test.review_id')::uuid,'Forged applicant response');
  raise exception 'Cross-account reply accepted';
exception when raise_exception then if sqlerrm<>'Information request is unavailable' then raise;end if;end $$;
reset role;

insert into storage.objects(bucket_id,name)
select 'case-files',current_setting('test.review_student')||'/'||id||'.pdf'
from unnest(array['81000000-0000-4000-8000-000000000041','81000000-0000-4000-8000-000000000042']) files(id);
set role service_role;
select public.register_uploaded_case_file(current_setting('test.review_student')::uuid,id,'document','achievements',
  current_setting('test.review_student')||'/'||id::text||'.pdf','application/pdf',100,repeat('a',64),null,false,name)
from (values ('81000000-0000-4000-8000-000000000041'::uuid,'Award A.pdf'),
  ('81000000-0000-4000-8000-000000000042'::uuid,'Award B.pdf')) files(id,name);
reset role;

set role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.review_student'),'aal','aal1')::text,true);
select public.test_assert(exists(select 1 from public.full_application_updates
  where status='needs_information' and note='Please add both award certificates.'),'applicant can read the request');
select public.test_assert((select count(*)=2 from public.case_files where category='achievements'),'multiple certificates stay attached');
do $$begin
  perform public.review_full_application(current_setting('test.review_id')::uuid,'needs_information','approved','Applicant tried approving own application');
  raise exception 'Applicant changed decision';
exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
select public.respond_to_full_application(current_setting('test.review_id')::uuid,'Both award certificates are attached.');
select public.test_assert((select status='submitted' from public.full_application_queue
  where id=current_setting('test.review_id')::uuid),'response returns the application to review');

select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.review_admin'),'aal','aal1')::text,true);
do $$begin
  perform public.review_full_application(current_setting('test.review_id')::uuid,'needs_information','declined','An outdated review should be rejected');
  raise exception 'Stale status update accepted';
exception when raise_exception then if sqlerrm<>'Application changed' then raise;end if;end $$;
select public.review_application_document('81000000-0000-4000-8000-000000000041',true,'');
select public.review_full_application(current_setting('test.review_id')::uuid,'submitted','in_review','Received your certificates and started reviewing your file.');
select public.test_assert(exists(select 1 from public.full_application_updates
  where status='in_review' and note='Received your certificates and started reviewing your file.'),'staff progress entry is retained');
reset role;
select public.test_assert(exists(select 1 from private.notification_outbox where event='full_application_information'
  and payload->>'applicationId'=current_setting('test.review_id')),'missing information emails carry the application ID');
rollback;
