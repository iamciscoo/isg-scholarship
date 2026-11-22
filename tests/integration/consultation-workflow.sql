begin;
select set_config('test.call_user','00000000-0000-4000-8000-000000000201',true);
select set_config('test.call_other','00000000-0000-4000-8000-000000000202',true);
select set_config('test.call_admin','00000000-0000-4000-8000-000000000103',true);
update public.leads set advisor_id=null where id=(select lead_id from public.consultation_cases where user_id=current_setting('test.call_user')::uuid);
set role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.call_user'),'aal','aal1')::text,true);
do $$begin
 perform public.save_my_consultation_draft('{}',1);
 raise exception 'Submitted consultation reopened';
exception when unique_violation then null;end $$;
select set_config('test.call_id',public.request_whatsapp_call(auth.uid(),'Tomorrow afternoon')::text,true);
select public.test_assert(public.request_whatsapp_call(auth.uid(),'Duplicate') is null,'one open WhatsApp call');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.call_other'),'aal','aal1')::text,true);
do $$begin
 perform public.request_whatsapp_call(current_setting('test.call_user')::uuid,'Forged request');
 raise exception 'Cross-account call permitted';
exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.call_admin'),'aal','aal1')::text,true);
select public.close_whatsapp_call(current_setting('test.call_id')::uuid);
select public.test_assert(public.request_whatsapp_call(current_setting('test.call_user')::uuid,'ISG availability') is not null,'staff can request a call');
select public.complete_consultation_call(current_setting('test.call_user')::uuid);
select public.test_assert((select completed_at is not null from public.consultation_cases where user_id=current_setting('test.call_user')::uuid),'call completion unlocks application');
rollback;
