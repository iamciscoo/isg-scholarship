create function public.admin_user_directory(p_search text, p_role text, p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.has_role(array['admin']::public.staff_role[]) then
    raise exception 'Access denied' using errcode='42501';
  end if;
  return (
    with accounts as materialized (
      select u.id, u.email, p.first_name, p.last_name, p.status, p.phone, p.nationality, p.residence,
        coalesce(r.role::text, 'applicant') as role, u.created_at, u.last_sign_in_at
      from auth.users u
      left join public.profiles p on p.id = u.id
      left join public.user_roles r on r.user_id = u.id
    ), matching as materialized (
      select a.* from accounts a
      where (coalesce(p_role, '') = '' or a.role = p_role)
        and (
          coalesce(p_search, '') = ''
          or strpos(lower(concat_ws(' ', nullif(a.email, ''), nullif(a.first_name, ''),
            nullif(a.last_name, ''), nullif(a.phone, ''))), lower(p_search)) > 0
          or exists (
            select 1 from public.eligibility_assessments e
            where e.applicant_id = a.id and strpos(lower(e.reference), lower(p_search)) > 0
          )
        )
    ), totals as (
      select (select count(*) from accounts) as accounts,
        (select count(*) from accounts where role <> 'applicant') as staff,
        count(*) as results,
        greatest(1, least(coalesce(p_page, 1), (count(*) + 19) / 20)) as page
      from matching
    ), page_accounts as (
      select * from matching order by created_at desc, id
      limit 20 offset (select (page - 1) * 20 from totals)
    )
    select to_jsonb(totals) || jsonb_build_object('users', coalesce((
      select jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'has_case', c.user_id is not null,
        'reference', e.reference,
        'applications', (select count(*) from public.study_applications s where s.user_id = a.id)
      ) order by a.created_at desc, a.id)
      from page_accounts a
      left join public.consultation_cases c on c.user_id = a.id
      left join public.leads l on l.id = c.lead_id
      left join public.eligibility_assessments e on e.id = l.assessment_id
    ), '[]'::jsonb))
    from totals
  );
end $$;
revoke all on function public.admin_user_directory(text,text,integer) from public,anon,authenticated;
grant execute on function public.admin_user_directory(text,text,integer) to authenticated;
