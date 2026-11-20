-- Two roles only: admin (who also advise) and applicant.
update public.user_roles set role = 'admin' where role = 'advisor';

create or replace function public.assign_staff_role(p_user uuid, p_role public.staff_role) returns void
language plpgsql security definer set search_path = '' as $$
declare old_role public.staff_role;
begin
  perform pg_advisory_xact_lock(817170008);
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  if p_role not in ('admin', 'applicant') then raise exception 'Choose admin or applicant'; end if;
  select role into old_role from public.user_roles where user_id = p_user for update;
  if not found or not exists(select 1 from auth.users u join public.profiles p on p.id = u.id where u.id = p_user and u.email_confirmed_at is not null and p.status = 'active') then raise exception 'Account unavailable'; end if;
  if old_role = 'admin' and p_role <> 'admin' and (select count(*) from public.user_roles r join public.profiles p on p.id = r.user_id where r.role = 'admin' and p.status = 'active') <= 1 then raise exception 'Keep at least one administrator'; end if;
  update public.user_roles set role = p_role where user_id = p_user;
  insert into public.audit_logs(actor_id, action, entity_id, metadata) values (auth.uid(), 'staff.role_assigned', p_user, jsonb_build_object('from', old_role, 'to', p_role));
end $$;

create or replace function public.advisor_directory() returns table(id uuid, first_name text, last_name text, email text)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  return query
  select p.id, p.first_name, p.last_name, u.email::text
  from public.profiles p
  join public.user_roles r on r.user_id = p.id
  join auth.users u on u.id = p.id
  where r.role = 'admin' and p.status = 'active'
  order by p.first_name, p.last_name, p.id;
end $$;