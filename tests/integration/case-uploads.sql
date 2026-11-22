begin;

select set_config('test.upload_owner','00000000-0000-4000-8000-000000000801',true);
insert into auth.users(id,email,email_confirmed_at)
values(current_setting('test.upload_owner')::uuid,'upload-owner@example.invalid',null);

set local role service_role;
select public.submit_my_consultation(
  (select data||'{"email":"upload-owner@example.invalid"}'::jsonb from public.test_payload),
  gen_random_uuid(),'upload-fixture',current_setting('test.upload_owner')::uuid,''
);
reset role;

create temporary table upload_fixtures(label text,id uuid,kind text,category text,ext text,mime text)
on commit drop;
insert into upload_fixtures values
  ('support-a',gen_random_uuid(),'support','consultation_support','pdf','application/pdf'),
  ('support-b',gen_random_uuid(),'support','consultation_support','webp','image/webp'),
  ('receipt',gen_random_uuid(),'receipt','payment_receipt','pdf','application/pdf'),
  ('achievement-a',gen_random_uuid(),'document','achievements','pdf','application/pdf'),
  ('achievement-b',gen_random_uuid(),'document','achievements','pdf','application/pdf'),
  ('unrequested',gen_random_uuid(),'document','unrequested','pdf','application/pdf');
grant select on upload_fixtures to service_role,authenticated;
insert into storage.objects(bucket_id,name)
select 'case-files',current_setting('test.upload_owner')||'/'||id||'.'||ext from upload_fixtures;

set local role service_role;
select public.register_uploaded_case_file(
  current_setting('test.upload_owner')::uuid,id,kind,category,
  current_setting('test.upload_owner')||'/'||id||'.'||ext,mime,100,repeat('a',64),null,false,label||'.'||ext
)
from upload_fixtures where kind='support';

do $$begin
  perform public.register_uploaded_case_file(
    current_setting('test.upload_owner')::uuid,id,kind,category,
    current_setting('test.upload_owner')||'/'||id||'.'||ext,mime,100,repeat('a',64),null,false,label||'.'||ext
  )
  from upload_fixtures where label='achievement-a';
  raise exception 'Application upload before unlock was accepted';
exception when raise_exception then if sqlerrm<>'Application locked' then raise; end if;
end $$;

select public.register_uploaded_case_file(
  current_setting('test.upload_owner')::uuid,id,kind,category,
  current_setting('test.upload_owner')||'/'||id||'.'||ext,mime,100,repeat('b',64),null,false,label||'.'||ext
)
from upload_fixtures where kind='receipt';
reset role;

set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.upload_owner'),'aal','aal1')::text,true);
select public.test_assert((select count(*)=2 from public.case_files where kind='support'),'owner sees both supporting files');
select public.test_assert((select count(*)=1 from public.case_files where kind='receipt' and review_status='pending'),
  'supporting files do not change receipt review');
select public.test_assert(not has_function_privilege('authenticated',
  'public.register_uploaded_case_file(uuid,uuid,text,text,text,text,integer,text,uuid,boolean,text)','execute'),
  'applicants cannot register files with the service RPC');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000202","aal":"aal1"}',true);
select public.test_assert((select count(*)=0 from public.case_files),'unrelated applicant cannot access private uploads');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","aal":"aal1"}',true);
select public.test_assert((select count(*)=2 from public.case_files where kind='support' and
  user_id=current_setting('test.upload_owner')::uuid),'admin can review both supporting uploads');
select public.review_payment_receipt(id,true,'') from upload_fixtures where kind='receipt';
select public.complete_consultation_call(current_setting('test.upload_owner')::uuid);
reset role;

set local role service_role;
select public.register_uploaded_case_file(
  current_setting('test.upload_owner')::uuid,id,kind,category,
  current_setting('test.upload_owner')||'/'||id||'.'||ext,mime,100,repeat('c',64),null,false,label||'.'||ext
)
from upload_fixtures where label in ('achievement-a','achievement-b');
do $$begin
  perform public.register_uploaded_case_file(
    current_setting('test.upload_owner')::uuid,id,kind,category,
    current_setting('test.upload_owner')||'/'||id||'.'||ext,mime,100,repeat('a',64),null,false,label||'.'||ext
  )
  from upload_fixtures where label='unrequested';
  raise exception 'Unrequested application category was accepted';
exception when raise_exception then if sqlerrm<>'Document category unavailable' then raise; end if;
end $$;
reset role;

select public.test_assert((select count(*)=2 and count(distinct original_name)=2 from public.case_files
  where user_id=current_setting('test.upload_owner')::uuid and kind='document' and category='achievements'),
  'unlocked applicant can register multiple separate documents in one category');
rollback;
