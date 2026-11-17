-- Real account notifications. No messages or recipients are seeded.
create table public.account_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 120),
  body text not null check (length(trim(body)) between 5 and 2000),
  link text not null default '' check (link = '' or link ~ '^/(dashboard(/profile)?|eligibility|contact|pathways|how-it-works|services|pricing|faqs)$'),
  recipient_id uuid references public.profiles on delete cascade,
  author_id uuid references public.profiles on delete set null,
  request_id uuid not null unique,
  created_at timestamptz not null default now()
);
create table public.notification_reads (
  notification_id uuid not null references public.account_notifications on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id,user_id)
);
create index account_notifications_recipient_idx on public.account_notifications(recipient_id,created_at desc);
alter table public.account_notifications enable row level security;
alter table public.notification_reads enable row level security;
grant select on public.account_notifications,public.notification_reads to authenticated;
revoke all on public.account_notifications,public.notification_reads from anon;
create policy account_notifications_read on public.account_notifications for select to authenticated
  using(private.active_user() and (recipient_id is null or recipient_id=auth.uid() or private.has_role(array['admin']::public.staff_role[])));
create policy notification_reads_own on public.notification_reads for select to authenticated
  using(private.active_user() and user_id=auth.uid());

create function public.publish_account_notification(p_title text,p_body text,p_link text,p_recipient uuid,p_request uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare previous public.account_notifications; result uuid;
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  if p_recipient is not null and not exists(select 1 from public.profiles where id=p_recipient and status='active') then raise exception 'Recipient unavailable'; end if;
  -- Serialize duplicate requests before checking the idempotency key.
  perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
  select * into previous from public.account_notifications where request_id=p_request;
  if found then
    if previous.author_id=auth.uid() and previous.title=trim(p_title) and previous.body=trim(p_body)
      and previous.link=p_link and previous.recipient_id is not distinct from p_recipient then return previous.id; end if;
    raise exception 'Request already used';
  end if;
  insert into public.account_notifications(title,body,link,recipient_id,author_id,request_id)
    values(trim(p_title),trim(p_body),p_link,p_recipient,auth.uid(),p_request) returning id into result;
  insert into public.audit_logs(actor_id,action,entity_id,metadata) values(auth.uid(),'notification.published',result,jsonb_build_object('audience',case when p_recipient is null then 'all_accounts' else 'one_account' end));
  return result;
end $$;

create function public.account_notification_inbox() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare items jsonb; unread bigint;
begin
  if not private.active_user() then raise exception 'Access denied'; end if;
  select count(*) into unread from public.account_notifications n where (n.recipient_id is null or n.recipient_id=auth.uid())
    and not exists(select 1 from public.notification_reads r where r.notification_id=n.id and r.user_id=auth.uid());
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) into items from (
    select n.id,n.title,n.body,n.link,n.created_at,exists(select 1 from public.notification_reads r where r.notification_id=n.id and r.user_id=auth.uid()) as is_read
    from public.account_notifications n where n.recipient_id is null or n.recipient_id=auth.uid() order by n.created_at desc,n.id limit 20
  ) t;
  return jsonb_build_object('items',items,'unread',unread);
end $$;

create function public.read_account_notifications(p_id uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.active_user() then raise exception 'Access denied'; end if;
  insert into public.notification_reads(notification_id,user_id)
    select n.id,auth.uid() from public.account_notifications n
    where (n.recipient_id is null or n.recipient_id=auth.uid()) and (p_id is null or n.id=p_id)
    on conflict do nothing;
end $$;
revoke all on function public.publish_account_notification(text,text,text,uuid,uuid),public.account_notification_inbox(),public.read_account_notifications(uuid) from public,anon;
grant execute on function public.publish_account_notification(text,text,text,uuid,uuid),public.account_notification_inbox(),public.read_account_notifications(uuid) to authenticated;
