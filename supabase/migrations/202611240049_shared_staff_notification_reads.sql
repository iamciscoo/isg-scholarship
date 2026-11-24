-- Staff alerts are broadcast rows shared by every admin, so one admin reading one must clear it for all.
create or replace function public.read_account_notifications(p_id uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.active_user() then raise exception 'Access denied'; end if;
  insert into public.notification_reads(notification_id,user_id)
    select n.id,auth.uid() from public.account_notifications n
    where (n.recipient_id is null or n.recipient_id=auth.uid()) and (p_id is null or n.id=p_id)
    on conflict do nothing;
  insert into public.notification_reads(notification_id,user_id)
    select n.id,r.user_id
    from public.account_notifications n
    join public.user_roles r on r.role in ('admin','advisor')
    where (n.recipient_id is null or n.recipient_id=auth.uid())
      and (p_id is null or n.id=p_id)
      and (n.link like '/admin%' or n.link like '/advisor%')
    on conflict do nothing;
end $$;
revoke all on function public.read_account_notifications(uuid) from public,anon;
grant execute on function public.read_account_notifications(uuid) to authenticated;