-- Name/email lookup for the staff application list filters.
create or replace function public.staff_application_users(p_search text)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select u.id
  from auth.users u
  left join public.profiles p on p.id = u.id
  where private.has_role(array['admin', 'advisor']::public.staff_role[])
    and (
      coalesce(trim(p_search), '') = ''
      or strpos(
        lower(concat_ws(' ', nullif(u.email, ''), nullif(p.first_name, ''), nullif(p.last_name, ''))),
        lower(trim(p_search))
      ) > 0
    )
$$;
revoke all on function public.staff_application_users(text) from public, anon;
grant execute on function public.staff_application_users(text) to authenticated;
