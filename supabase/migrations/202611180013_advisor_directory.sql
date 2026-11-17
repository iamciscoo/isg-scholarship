-- Assignment options must filter advisors before account-directory pagination.
create function public.advisor_directory() returns table(id uuid,first_name text,last_name text,email text)
language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
 return query
 select p.id,p.first_name,p.last_name,u.email::text
 from public.profiles p
 join public.user_roles r on r.user_id=p.id
 join auth.users u on u.id=p.id
 where r.role='advisor' and p.status='active'
 order by p.first_name,p.last_name,p.id;
end $$;
revoke all on function public.advisor_directory() from public,anon;
grant execute on function public.advisor_directory() to authenticated;
