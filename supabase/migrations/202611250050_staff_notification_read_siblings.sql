-- Staff alerts are written as one row per admin (same title, link and timestamp, different request ids),
-- so reading one must mark the sibling rows read for their own recipients.
create or replace function public.read_account_notifications(p_id uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.active_user() then raise exception 'Access denied'; end if;
  insert into public.notification_reads(notification_id,user_id)
    select n.id,auth.uid() from public.account_notifications n
    where (n.recipient_id is null or n.recipient_id=auth.uid()) and (p_id is null or n.id=p_id)
    on conflict do nothing;
  insert into public.notification_reads(notification_id,user_id)
    select s.id,s.recipient_id
    from public.account_notifications n
    join public.account_notifications s
      on s.title=n.title and s.link is not distinct from n.link and s.created_at=n.created_at
    where (n.recipient_id is null or n.recipient_id=auth.uid())
      and (p_id is null or n.id=p_id)
      and s.recipient_id is not null
      and (s.link like '/admin%' or s.link like '/advisor%')
    on conflict do nothing;
end $$;
revoke all on function public.read_account_notifications(uuid) from public,anon;
grant execute on function public.read_account_notifications(uuid) to authenticated;