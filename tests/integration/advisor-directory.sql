-- Disposable fixtures only; keep directory-volume checks separate from account tests.
begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000301','directory-admin@example.invalid'),
 ('00000000-0000-4000-8000-000000000302','older-advisor@example.invalid'),
 ('00000000-0000-4000-8000-000000000303','inactive-advisor@example.invalid');
update public.user_roles set role='admin' where user_id='00000000-0000-4000-8000-000000000301';
update public.user_roles set role='advisor' where user_id in ('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000303');
update public.profiles set first_name='Older',last_name='Advisor',created_at='2000-01-01' where id='00000000-0000-4000-8000-000000000302';
update public.profiles set status='suspended' where id='00000000-0000-4000-8000-000000000303';
insert into auth.users(id,email)
 select ('50000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'directory-applicant-'||n||'@example.invalid'
 from generate_series(1,501) n;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000301","aal":"aal1"}',false);
select public.test_assert(not exists(select 1 from public.staff_accounts() where id='00000000-0000-4000-8000-000000000302'),'fixture reproduces older advisor falling outside the newest 500 accounts');
select public.test_assert(exists(select 1 from public.advisor_directory() where id='00000000-0000-4000-8000-000000000302' and first_name='Older' and last_name='Advisor' and email='older-advisor@example.invalid'),'active advisor remains available after 501 newer applicant registrations');
select public.test_assert(not exists(select 1 from public.advisor_directory() where id in ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000303','50000000-0000-4000-8000-000000000001')),'directory excludes administrators, suspended advisors, and applicants');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000302","aal":"aal1"}',false);
do $$ begin perform public.advisor_directory();raise exception 'Advisor read administrator directory';exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
select set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000001","aal":"aal1"}',false);
do $$ begin perform public.advisor_directory();raise exception 'Applicant read administrator directory';exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
reset role;
set role anon;
do $$ begin perform public.advisor_directory();raise exception 'Anonymous directory access permitted';exception when insufficient_privilege then null;end $$;
reset role;
rollback;
select 'ADVISOR DIRECTORY TESTS PASSED' as result;
