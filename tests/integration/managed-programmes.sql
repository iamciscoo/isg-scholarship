begin;
select public.test_assert((select count(*)=60 from public.study_promotions where catalogue_key like 'legacy-guide-%'),'all original guides preserved');
select public.test_assert((select bool_and(destinations=array['Russia','United Kingdom','Germany','Canada']) from public.study_promotions where catalogue_key like 'legacy-guide-%'),'original four destinations retained');
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000201"}',false);
do $$begin perform public.save_study_promotion(null,'{}');raise exception 'Applicant saved programme';exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
do $$begin perform public.delete_study_promotion('00000000-0000-4000-8000-000000000001');raise exception 'Applicant deleted programme';exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103"}',false);
select public.save_study_promotion('d0000000-0000-4000-8000-000000000001',
  '{"title":"Programme QA","destinations":["Tanzania","Canada"],"studyLevel":"Undergraduate","field":"Engineering","fundingType":"Discuss with advisor","eligibility":"QA","image":"/images/study-1.webp","published":true}');
select public.test_assert((select destination='Tanzania' and destinations=array['Tanzania','Canada'] from public.study_promotions where id='d0000000-0000-4000-8000-000000000001'),'multi-country programme saved');
-- Old deployed clients still work against the expanded schema.
select public.save_study_promotion('d0000000-0000-4000-8000-000000000001',
  '{"title":"Programme QA old client","destination":"Germany","studyLevel":"Undergraduate","field":"Engineering","fundingType":"Discuss with advisor","eligibility":"QA","image":"/images/study-1.webp","published":false}');
select public.test_assert((select destinations=array['Germany'] from public.study_promotions where id='d0000000-0000-4000-8000-000000000001'),'legacy RPC and first destination compatible');
do $$begin perform public.save_study_promotion(null,'{"destinations":[]}');raise exception 'Empty countries accepted';exception when raise_exception then if sqlerrm<>'Choose destinations' then raise;end if;end $$;
do $$begin perform public.save_study_promotion(null,'{"title":"QA","destinations":["Canada","Canada"],"studyLevel":"Undergraduate","field":"Engineering","fundingType":"QA","eligibility":"QA","image":"/images/study-1.webp","published":true}');raise exception 'Duplicate countries accepted';exception when raise_exception then if sqlerrm<>'Choose distinct destinations' then raise;end if;end $$;
reset role;
set role anon;
select public.test_assert(not exists(select 1 from public.study_promotions where id='d0000000-0000-4000-8000-000000000001'),'drafts hidden from visitors');
reset role;
-- Removing a country's last published programme must not reveal a hardcoded fallback.
update public.study_promotions set destinations=array_remove(destinations,'Russia') where 'Russia'=any(destinations) and cardinality(destinations)>1;
update public.study_promotions set published=false where destinations=array['Russia'];
set role anon;
select public.test_assert(not exists(select 1 from public.study_promotions where 'Russia'=any(destinations)),'removed country absent from published catalogue');
reset role;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103"}',false);
select public.delete_study_promotion('d0000000-0000-4000-8000-000000000001');
reset role;
do $$declare lead_id uuid;begin
  select id into lead_id from public.leads limit 1;
  if lead_id is not null then
    update public.leads set stage='converted' where id=lead_id;
    perform public.test_assert((select stage='qualified' from public.leads where id=lead_id),'old completed writes normalized');
    update public.leads set stage='not_currently_eligible' where id=lead_id;
    perform public.test_assert((select stage='closed' from public.leads where id=lead_id),'old closed writes normalized');
  end if;
end $$;
select public.test_assert(not exists(select 1 from public.study_promotions where id='d0000000-0000-4000-8000-000000000001'),'admin deletion persisted');
rollback;
