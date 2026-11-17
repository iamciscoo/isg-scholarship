set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000201","aal":"aal1"}',false);
select public.save_my_consultation_draft('{"firstName":"Updated","lastName":"Student","phone":"+255700000001","nationality":"Tanzanian","residence":"Tanzania"}',1);
select public.test_assert((select first_name='Updated' and phone='+255700000001' from public.profiles where id=auth.uid()),'draft personal details are reused in the profile');
select public.test_assert((select data->>'firstName'='Updated' from public.consultation_drafts),'profile and draft save together');
do $$ begin
 perform public.save_my_consultation_draft(jsonb_build_object('firstName',repeat('x',81),'lastName','Too long'),2);
 raise exception 'Invalid profile accepted';
exception when check_violation then null;end $$;
select public.test_assert((select data->>'firstName'='Updated' and step=1 from public.consultation_drafts),'profile validation failure rolls draft back');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000202","aal":"aal1"}',false);
select public.save_my_consultation_draft('{"firstName":"Other","lastName":"Student"}',1);
select public.test_assert((select count(*)=1 from public.consultation_drafts),'draft RPC cannot expose another account');
reset role;
set role anon;
do $$ begin perform public.save_my_consultation_draft('{}',1);raise exception 'Anonymous draft permitted';exception when insufficient_privilege then null;end $$;
reset role;
select 'ATOMIC DRAFT AND PROFILE SYNC TESTS PASSED' as result;
