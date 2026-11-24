alter table public.account_notifications add column email_requested boolean not null default false;

create function public.publish_account_notification(
  p_title text,p_body text,p_link text,p_recipient uuid,p_request uuid,p_email boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.account_notifications; result uuid; send_email boolean:=coalesce(p_email,false);
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  -- Keep the inbox entry, audit record and per-recipient email jobs in one transaction.
  perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
  select * into previous from public.account_notifications where request_id=p_request;
  if found then
    if previous.author_id=auth.uid() and previous.title=trim(p_title) and previous.body=trim(p_body)
      and previous.link=p_link and previous.recipient_id is not distinct from p_recipient
      and previous.email_requested=send_email then return previous.id; end if;
    raise exception 'Request already used';
  end if;
  if p_recipient is not null and not exists (
    select 1 from public.profiles where id=p_recipient and status='active'
  ) then raise exception 'Recipient unavailable'; end if;
  insert into public.account_notifications(title,body,link,recipient_id,author_id,request_id,email_requested)
    values(trim(p_title),trim(p_body),p_link,p_recipient,auth.uid(),p_request,send_email) returning id into result;
  insert into public.audit_logs(actor_id,action,entity_id,metadata)
    values(auth.uid(),'notification.published',result,
      jsonb_build_object('audience',case when p_recipient is null then 'all_accounts' else 'one_account' end,
        'email_requested',send_email));
  if send_email then
    insert into private.notification_outbox(event,recipient,payload,dedupe_key)
    select 'account_notification_published',address,'{}',result::text||':announcement:'||address
    from (
      select distinct lower(u.email) as address
      from public.profiles p join auth.users u on u.id=p.id
      where p.status='active' and (p_recipient is null or p.id=p_recipient)
        and u.email_confirmed_at is not null and nullif(trim(u.email),'') is not null
    ) as recipients;
  end if;
  return result;
end $$;

-- Older clients continue to publish inbox-only notifications.
create or replace function public.publish_account_notification(
  p_title text,p_body text,p_link text,p_recipient uuid,p_request uuid
) returns uuid language sql security invoker set search_path='' as $$
  select public.publish_account_notification(p_title,p_body,p_link,p_recipient,p_request,false)
$$;

revoke all on function public.publish_account_notification(text,text,text,uuid,uuid,boolean) from public,anon;
grant execute on function public.publish_account_notification(text,text,text,uuid,uuid,boolean) to authenticated;
