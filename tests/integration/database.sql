-- Disposable fixtures and adversarial tests only, never run on a hosted project.
create function public.test_assert(condition boolean, message text) returns void language plpgsql as $$
begin if condition is distinct from true then raise exception 'ASSERTION FAILED: %',message; end if; end $$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000001','one@example.invalid',now(),'{"role":"admin"}'),
 ('00000000-0000-4000-8000-000000000002','two@example.invalid',now(),'{}'),
 ('00000000-0000-4000-8000-000000000003','advisor@example.invalid',now(),'{}'),
 ('00000000-0000-4000-8000-000000000004','admin@example.invalid',now(),'{}'),
 ('00000000-0000-4000-8000-000000000005','unverified@example.invalid',null,'{}');
select public.test_assert((select role='applicant' from public.user_roles where user_id='00000000-0000-4000-8000-000000000001'),'metadata cannot create an admin');
update public.user_roles set role='advisor' where user_id='00000000-0000-4000-8000-000000000003';
update public.user_roles set role='admin' where user_id='00000000-0000-4000-8000-000000000004';
create table public.test_payload(data jsonb);
insert into public.test_payload values('{"firstName":"Test","lastName":"Applicant","email":"one@example.invalid","phone":"+255700000000","nationality":"Tanzanian","residence":"Tanzania","qualification":"Bachelor degree","educationStatus":"Graduated","fieldOfStudy":"Engineering","performance":"B","graduationYear":"2025","englishStatus":"Studied in English","studyLevel":"Master''s","preferredFields":"Engineering","destinations":"","intake":"2027","funding":"Full funding needed","constraints":"","processingConsent":true,"marketingConsent":false,"adultConfirmation":true}');
grant select on public.test_payload to service_role;
set role service_role;
select public.submit_assessment((select data from public.test_payload),'10000000-0000-4000-8000-000000000001','hash-one','');
select public.submit_assessment((select data from public.test_payload),'10000000-0000-4000-8000-000000000001','hash-one','');
select public.submit_assessment((select data || '{"email":"two@example.invalid"}'::jsonb from public.test_payload),'10000000-0000-4000-8000-000000000002','hash-two','');
do $$ begin
  perform public.submit_assessment((select data from public.test_payload),'10000000-0000-4000-8000-000000000001','changed-hash','');
  raise exception 'Idempotency mismatch was accepted';
exception when raise_exception then if sqlerrm<>'Idempotency mismatch' then raise; end if; end $$;
reset role;
select public.test_assert((select count(*)=2 from public.eligibility_assessments),'retries do not duplicate assessments');
select public.test_assert((select count(*)=2 from public.leads),'lead creation is atomic');
select public.test_assert((select count(*)=6 from public.consent_records),'all consent choices are recorded');
select public.test_assert((select count(*)=2 from private.notification_outbox),'notification deduplication');
set role anon;
do $$ begin perform count(*) from public.eligibility_assessments; raise exception 'Anonymous read permitted'; exception when insufficient_privilege then null; end $$;
do $$ begin perform public.consume_rate_limit('forged',100,1); raise exception 'Anonymous rate-limit write permitted'; exception when insufficient_privilege then null; end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal1"}',false);
select public.link_my_assessments();
select public.test_assert((select count(*)=1 from public.eligibility_assessments),'applicant reads only verified-email-linked assessment');
select public.test_assert((select count(*)=0 from public.leads),'applicant cannot read staff lead records');
do $$ begin update public.user_roles set role='admin' where user_id=auth.uid(); raise exception 'Role escalation permitted'; exception when insufficient_privilege then null; end $$;
do $$ begin update public.profiles set status='active' where id=auth.uid(); raise exception 'Status escalation permitted'; exception when insufficient_privilege then null; end $$;
do $$ begin perform public.review_lead(gen_random_uuid(),'qualified','Forged review',null,null); raise exception 'Applicant review permitted'; exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","aal":"aal1"}',false);
select public.test_assert((select count(*)=0 from public.eligibility_assessments),'other applicant cannot read before linking');
select public.link_my_assessments();
select public.test_assert((select count(*)=1 from public.eligibility_assessments),'other applicant sees only their assessment');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000005","aal":"aal1"}',false);
do $$ begin perform public.link_my_assessments(); raise exception 'Unverified linking permitted'; exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","aal":"aal1"}',false);
select public.test_assert((select count(*)=0 from public.leads),'advisor without MFA is denied');
reset role;
update public.leads set advisor_id='00000000-0000-4000-8000-000000000003' where assessment_id=(select id from public.eligibility_assessments where email='one@example.invalid');
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","aal":"aal2"}',false);
select public.test_assert((select count(*)=1 from public.leads),'advisor sees only assigned leads');
select public.test_assert((select count(*)=1 from public.eligibility_assessments),'advisor sees only assigned assessments');
select public.review_lead((select id from public.leads limit 1),'under_review','Reviewed test qualifications','00000000-0000-4000-8000-000000000003',null);
do $$ begin perform public.review_lead((select id from public.leads limit 1),'qualified','Forged reassignment',null,null); raise exception 'Advisor reassignment permitted'; exception when raise_exception then if sqlerrm<>'Only administrators assign advisors' then raise; end if; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000004","aal":"aal1"}',false);
select public.test_assert((select count(*)=2 from public.leads),'password-authenticated administrator can read leads');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000004","aal":"aal2"}',false);
select public.test_assert((select count(*)=2 from public.leads),'MFA administrator can review all leads');
select public.test_assert((select count(*)>=1 from public.audit_logs where action='lead.reviewed'),'review writes an audit record');
do $$ begin update public.leads set stage='closed'; raise exception 'Direct lead mutation permitted'; exception when insufficient_privilege then null; end $$;
reset role;
update public.profiles set status='suspended' where id='00000000-0000-4000-8000-000000000004';
set role authenticated;
select public.test_assert((select count(*)=0 from public.leads),'suspended admin cannot read leads');
reset role;
set role service_role;
select public.test_assert(public.consume_rate_limit('test-client',2,900),'first request allowed');
select public.test_assert(public.consume_rate_limit('test-client',2,900),'second request allowed');
select public.test_assert(not public.consume_rate_limit('test-client',2,900),'excess requests denied');
select public.test_assert((select count(*)=2 from public.claim_notifications(10)),'worker claims notifications');
select public.test_assert((select count(*)=0 from public.claim_notifications(10)),'concurrent worker cannot reclaim leased notifications');
reset role;
update private.notification_outbox set attempts=5,lease_until=now()-interval '1 minute' where state='processing';
set role service_role;
select count(*) from public.claim_notifications(10);
reset role;
select public.test_assert((select count(*)=2 from private.notification_outbox where state='failed'),'exhausted crashed deliveries become failed for administrative review');
select 'ALL PERMISSION AND TRANSACTION TESTS PASSED' as result;
