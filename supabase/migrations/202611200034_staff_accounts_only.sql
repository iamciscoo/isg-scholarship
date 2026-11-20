-- The team page manages staff only; applicants are handled on the users directory.
create or replace function public.staff_accounts() returns table(id uuid, email text, first_name text, last_name text, role public.staff_role, status text)
language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
 return query select p.id,u.email::text,p.first_name,p.last_name,r.role,p.status
 from public.profiles p
 join auth.users u on u.id=p.id
 join public.user_roles r on r.user_id=p.id
 where r.role <> 'applicant'
 order by p.created_at desc limit 500;
end $$;
revoke all on function public.staff_accounts() from public,anon;
grant execute on function public.staff_accounts() to authenticated;