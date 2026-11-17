-- Disposable identities only. This file must never run against hosted Supabase.
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000101','notify-one@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000102','notify-two@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000103','notify-admin@example.invalid',now());
update public.user_roles set role='admin' where user_id='00000000-0000-4000-8000-000000000103';
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","aal":"aal1"}',false);
do $$ begin
  perform public.publish_account_notification('Test title','Test message','',null,gen_random_uuid());
  raise exception 'MFA bypass allowed';
exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","aal":"aal2"}',false);
select public.publish_account_notification('Broadcast fixture','Test accounts only','/dashboard',null,'20000000-0000-4000-8000-000000000001');
select public.publish_account_notification('Personal fixture','Test accounts only','', '00000000-0000-4000-8000-000000000101','20000000-0000-4000-8000-000000000002');
select public.publish_account_notification('Other fixture','Private to account two','', '00000000-0000-4000-8000-000000000102','20000000-0000-4000-8000-000000000003');
select public.publish_account_notification('Broadcast fixture','Test accounts only','/dashboard',null,'20000000-0000-4000-8000-000000000001');
select public.test_assert((select count(*)=3 from public.account_notifications),'publish retries are idempotent');
do $$ begin
  perform public.publish_account_notification('Changed payload','Test accounts only','/dashboard',null,'20000000-0000-4000-8000-000000000001');
  raise exception 'Changed retry accepted';
exception when raise_exception then if sqlerrm<>'Request already used' then raise; end if; end $$;
do $$ begin
  perform public.publish_account_notification('Unsafe link','Test accounts only','//evil.invalid',null,gen_random_uuid());
  raise exception 'Unsafe link accepted';
exception when check_violation then null; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","aal":"aal1"}',false);
select public.test_assert((select count(*)=2 from public.account_notifications),'recipient sees only broadcast and own message');
select public.test_assert((public.account_notification_inbox()->>'unread')::int=2,'unread count comes from real read state');
select public.read_account_notifications((select id from public.account_notifications where title='Personal fixture'));
select public.test_assert((public.account_notification_inbox()->>'unread')::int=1,'reading decrements unread count');
select public.read_account_notifications();
select public.test_assert((public.account_notification_inbox()->>'unread')::int=0,'mark all reads visible messages');
do $$ begin
  perform public.publish_account_notification('Forged notification','Must be denied','',null,gen_random_uuid());
  raise exception 'Applicant published';
exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","aal":"aal1"}',false);
select public.test_assert((public.account_notification_inbox()->>'unread')::int=2,'another account has independent read state');
select public.test_assert((select count(*)=0 from public.notification_reads),'read rows stay private');
insert into storage.objects(bucket_id,name) values('profile-avatars','00000000-0000-4000-8000-000000000102/30000000-0000-4000-8000-000000000001.webp');
select public.set_profile_avatar('00000000-0000-4000-8000-000000000102/30000000-0000-4000-8000-000000000001.webp');
select public.test_assert((select avatar_path is not null from public.profiles where id=auth.uid()),'owner can select uploaded avatar');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","aal":"aal1"}',false);
select public.test_assert((select count(*)=0 from storage.objects),'other avatar is private');
do $$ begin
  perform public.set_profile_avatar('00000000-0000-4000-8000-000000000102/30000000-0000-4000-8000-000000000001.webp');
  raise exception 'Other avatar selected';
exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end $$;
do $$ begin
  insert into storage.objects(bucket_id,name) values('profile-avatars','00000000-0000-4000-8000-000000000102/forged.webp');
  raise exception 'Cross-account upload allowed';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.profiles set avatar_path=null where id=auth.uid();
  raise exception 'Direct avatar pointer edit permitted';
exception when insufficient_privilege then null; end $$;
reset role;
update public.profiles set status='suspended' where id='00000000-0000-4000-8000-000000000101';
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","aal":"aal1"}',false);
do $$ begin
  perform public.account_notification_inbox(); raise exception 'Suspended inbox permitted';
exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end $$;
reset role;
select public.test_assert((select count(*)=3 from public.audit_logs where action='notification.published'),'each publication is audited once');
select 'ACCOUNT NOTIFICATION AND AVATAR TESTS PASSED' as result;
