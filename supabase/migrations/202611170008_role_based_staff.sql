-- Owner-requested password sign-in: verified, active, database-assigned staff roles.
create or replace function private.has_role(roles public.staff_role[]) returns boolean language sql stable security definer set search_path = '' as $$
  select private.active_user() and exists(select 1 from public.user_roles where user_id=auth.uid() and role=any(roles));
$$;
create function public.staff_accounts() returns table(id uuid,email text,first_name text,last_name text,role public.staff_role,status text)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  return query select p.id,u.email::text,p.first_name,p.last_name,r.role,p.status from public.profiles p join auth.users u on u.id=p.id join public.user_roles r on r.user_id=p.id where u.email_confirmed_at is not null order by p.created_at desc limit 500;
end $$;
create function public.assign_staff_role(p_user uuid,p_role public.staff_role) returns void
language plpgsql security definer set search_path = '' as $$
declare old_role public.staff_role;
begin
  perform pg_advisory_xact_lock(817170008);
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  select role into old_role from public.user_roles where user_id=p_user for update;
  if not found or not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=p_user and u.email_confirmed_at is not null and p.status='active') then raise exception 'Account unavailable'; end if;
  if old_role='admin' and p_role<>'admin' and (select count(*) from public.user_roles r join public.profiles p on p.id=r.user_id where r.role='admin' and p.status='active')<=1 then raise exception 'Keep at least one administrator'; end if;
  update public.user_roles set role=p_role where user_id=p_user;
  insert into public.audit_logs(actor_id,action,entity_id,metadata) values(auth.uid(),'staff.role_assigned',p_user,jsonb_build_object('from',old_role,'to',p_role));
end $$;
revoke all on function public.staff_accounts(),public.assign_staff_role(uuid,public.staff_role) from public,anon;
grant execute on function public.staff_accounts(),public.assign_staff_role(uuid,public.staff_role) to authenticated;
