begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000601','email-notice-confirmed@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000602','email-notice-pending@example.invalid',null),
 ('00000000-0000-4000-8000-000000000603','email-notice-suspended@example.invalid',now());
update public.profiles set status='suspended' where id='00000000-0000-4000-8000-000000000603';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000601"}',true);
do $$begin
  perform public.notification_recipients();
  raise exception 'Applicant listed recipient addresses';
exception when insufficient_privilege then null; end $$;
do $$begin
  perform public.publish_account_notification('Announcement','This stays in the inbox.','',null,gen_random_uuid(),true);
  raise exception 'Applicant sent a broadcast';
exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103"}',true);
select public.test_assert(public.notification_recipients() @> '[{"id":"00000000-0000-4000-8000-000000000601"}]'
  and not (public.notification_recipients() @> '[{"id":"00000000-0000-4000-8000-000000000603"}]'),
  'active applicants are available as recipients and suspended accounts are excluded');
select public.publish_account_notification('Personal notice','This stays in the inbox.','/dashboard',
  '00000000-0000-4000-8000-000000000601','60000000-0000-4000-8000-000000000001',true) as single_notice \gset
select public.test_assert(public.publish_account_notification('Personal notice','This stays in the inbox.',
  '/dashboard','00000000-0000-4000-8000-000000000601','60000000-0000-4000-8000-000000000001',true)=:'single_notice',
  'retry returns the original publication');
do $$begin
  perform public.publish_account_notification('Personal notice','This stays in the inbox.','/dashboard',
    '00000000-0000-4000-8000-000000000601','60000000-0000-4000-8000-000000000001',false);
  raise exception 'Retry changed channels';
exception when raise_exception then if sqlerrm<>'Request already used' then raise; end if; end $$;
select public.publish_account_notification('Everyone notice','This stays in the inbox.','',
  null,'60000000-0000-4000-8000-000000000002',true) as broadcast_notice \gset
select public.publish_account_notification('Inbox-only notice','This stays in the inbox.','',
  null,'60000000-0000-4000-8000-000000000003',false) as inbox_notice \gset
reset role;

select public.test_assert((select count(*)=1 and bool_and(recipient='email-notice-confirmed@example.invalid'
  and payload='{}'::jsonb) from private.notification_outbox where dedupe_key like :'single_notice'||':announcement:%'),
  'one private email job was scheduled for the single recipient');
select public.test_assert((select count(*)=(
  select count(distinct lower(u.email)) from public.profiles p join auth.users u on u.id=p.id
  where p.status='active' and u.email_confirmed_at is not null and nullif(trim(u.email),'') is not null
) and not bool_or(recipient in ('email-notice-pending@example.invalid','email-notice-suspended@example.invalid'))
  from private.notification_outbox where dedupe_key like :'broadcast_notice'||':announcement:%'),
  'broadcast queues one email per active confirmed address');
select public.test_assert(not exists(select 1 from private.notification_outbox where dedupe_key like :'inbox_notice'||':announcement:%'),
  'inbox-only publication schedules no email');
select public.test_assert((select count(*)=1 from public.audit_logs where entity_id=:'single_notice' and action='notification.published'),
  'publication and retry share one audit record');
rollback;
