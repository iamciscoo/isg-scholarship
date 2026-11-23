-- Disposable legacy fixtures, inserted before migration 055 to exercise its backfill.
select private.notify_case_owner_with_details('00000000-0000-4000-8000-000000000101',
 'full_application_information','89000000-0000-4000-8000-000000000401','{"status":"Information requested"}');
select private.notify_case_owner_with_details('00000000-0000-4000-8000-000000000101',
 'full_application_submitted','89000000-0000-4000-8000-000000000402','{"status":"Submitted"}');
insert into public.account_notifications(title,body,link,recipient_id,author_id,request_id)
values('Legacy manual note','This authored message must remain unread.','/dashboard/application',
 '00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000103',gen_random_uuid());
