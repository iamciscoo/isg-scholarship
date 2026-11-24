-- The team directory lists staff. The notification composer can target any active account.
create function public.notification_recipients() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.has_role(array['admin']::public.staff_role[]) then
    raise exception 'Access denied' using errcode='42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',p.id,'name',concat_ws(' · ',nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),nullif(u.email,''))
    ) order by lower(p.first_name),lower(p.last_name),lower(u.email),p.id),'[]'::jsonb)
    from public.profiles p join auth.users u on u.id=p.id
    where p.status='active'
  );
end $$;
revoke all on function public.notification_recipients() from public,anon;
grant execute on function public.notification_recipients() to authenticated;
