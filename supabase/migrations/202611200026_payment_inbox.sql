create function public.admin_payment_overview(p_status text default 'all',p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.has_role(array['admin']::public.staff_role[]) then
    raise exception 'Access denied' using errcode='42501';
  end if;
  with payments as (
    select c.user_id,c.user_id as id,'consultation' as kind,'Consultation fee' as title,
      c.fee_tzs as amount,c.payment_status as state,c.created_at as updated_at
    from public.consultation_cases c
    union all
    select a.user_id,a.id,'package',a.proposal->>'name',(a.proposal->>'packageFee')::integer,
      case a.package_state when 'paid' then 'verified' when 'receipt_rejected' then 'rejected'
        else a.package_state end,a.updated_at
    from public.study_applications a
    where a.package_state in ('awaiting_receipt','pending_verification','receipt_rejected','paid')
  ), filtered as (
    select p.*,coalesce(nullif(trim(concat_ws(' ',b.first_name,b.last_name)),''),'Applicant') as applicant
    from payments p join public.profiles b on b.id=p.user_id
    where p_status='all' or p.state=p_status
  ), page as (
    select * from filtered order by updated_at desc,id,kind
    limit 20 offset (greatest(1,least(coalesce(p_page,1),100000))-1)*20
  ), results as (
    select p.*,f.id as receipt_id,f.mime as receipt_mime,f.review_status as receipt_status
    from page p left join lateral (
      select r.id,r.mime,r.review_status from public.case_files r where r.user_id=p.user_id and r.kind='receipt'
        and ((p.kind='consultation' and r.application_id is null) or r.application_id=p.id and p.kind='package')
      order by r.created_at desc,r.id limit 1
    ) f on true
  )
  select jsonb_build_object('count',(select count(*) from filtered),'items',
    coalesce(jsonb_agg(to_jsonb(results) order by updated_at desc,id,kind),'[]'::jsonb))
  into result from results;
  return result;
end $$;
revoke all on function public.admin_payment_overview(text,integer) from public,anon,authenticated;
grant execute on function public.admin_payment_overview(text,integer) to authenticated;

create or replace function public.account_notification_inbox() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare items jsonb; unread bigint; tasks jsonb; task_count bigint;
begin
  if not private.active_user() then raise exception 'Access denied' using errcode='42501'; end if;
  select count(*) into unread from public.account_notifications n
  where (n.recipient_id is null or n.recipient_id=auth.uid())
    and not exists(select 1 from public.notification_reads r where r.notification_id=n.id and r.user_id=auth.uid());
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id),'[]'::jsonb) into items from (
    select n.id,n.title,n.body,n.link,n.created_at,
      exists(select 1 from public.notification_reads r where r.notification_id=n.id and r.user_id=auth.uid()) as is_read
    from public.account_notifications n where n.recipient_id is null or n.recipient_id=auth.uid()
    order by n.created_at desc,n.id limit 20
  ) t;
  with due as (
    select c.user_id as id,'Consultation fee' as title,c.payment_status='rejected' as replacement,
      '/dashboard/consultations' as link,c.created_at as due_at
    from public.consultation_cases c where c.user_id=auth.uid() and c.payment_status in ('awaiting_receipt','rejected')
    union all
    select a.id,a.proposal->>'name',a.package_state='receipt_rejected','/dashboard/applications/'||a.id::text,a.updated_at
    from public.study_applications a where a.user_id=auth.uid() and a.status='Starting'
      and a.approval='approved' and a.package_state in ('awaiting_receipt','receipt_rejected')
  ), first_page as (
    select * from due order by due_at desc,id limit 20
  )
  select coalesce(jsonb_agg(to_jsonb(first_page)-'due_at' order by due_at desc,id),'[]'::jsonb),
    (select count(*) from due) into tasks,task_count from first_page;
  return jsonb_build_object('items',items,'unread',unread,'receiptTasks',tasks,'receiptTaskCount',task_count);
end $$;

alter table public.account_notifications drop constraint account_notifications_link_check;
alter table public.account_notifications add constraint account_notifications_link_check check(
  link='' or link ~ '^/(dashboard(/profile|/consultations|/applications(/[0-9a-f-]{36})?)?|eligibility|contact|pathways|how-it-works|services|pricing|faqs|admin/(inbox|enquiries|consultations|payments|applications|settings)|admin/(receipts|declarations)/[0-9a-f-]{36})$'
);

create or replace function private.notify_case_owner(p_user uuid,p_event text,p_key uuid,p_meet text default null,p_starts timestamptz default null)
returns void language plpgsql security definer set search_path='' as $$
declare recipient text; heading text; destination text;
begin
  select email into recipient from auth.users where id=p_user;
  insert into private.notification_outbox(event,recipient,payload,dedupe_key)
  values(p_event,recipient,jsonb_build_object('reference','ISG consultation','meetUrl',p_meet,'startsAt',p_starts),p_event||':'||p_key::text)
  on conflict(dedupe_key) do nothing;

  heading:=case p_event
    when 'advisor_assigned' then 'Your advisor is assigned'
    when 'meeting_scheduled' then 'Your advisor meeting is scheduled'
    when 'meeting_cancelled' then 'Your advisor meeting was cancelled'
    when 'consultation_reply' then 'Your advisor replied'
    when 'package_recommended' then 'A scholarship package is ready to review'
    when 'package_payment_update' then 'Your package receipt was reviewed'
    when 'application_update' then 'Your application has an update'
  end;
  if p_event='payment_update' and exists (
    select 1 from public.consultation_cases where user_id=p_user and payment_status='verified'
  ) then heading:='Your consultation payment is verified'; end if;
  if heading is null then return; end if;
  destination:=case p_event when 'package_recommended' then '/dashboard/applications/'||p_key::text
    when 'package_payment_update' then (
      select '/dashboard/applications/'||application_id::text from public.case_files where id=p_key
    )
    when 'application_update' then '/dashboard/applications'
    else '/dashboard/consultations' end;
  insert into public.account_notifications(title,body,link,recipient_id,request_id)
  values(heading,'Open your workspace for the latest details.',coalesce(destination,'/dashboard/applications'),
    p_user,md5('applicant:'||p_event||':'||p_key::text||':'||p_user::text)::uuid)
  on conflict(request_id) do nothing;
end $$;

-- The receipt feedback is optional. Two-character notes used to fail here after passing the form.
create or replace function public.review_consultation_payment(p_file uuid,p_approve boolean,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare f public.case_files; c public.consultation_cases;
begin
  if not private.has_role(array['admin']::public.staff_role[]) or p_approve is null
  then raise exception 'Access denied'; end if;
  select * into f from public.case_files where id=p_file and kind='receipt' and application_id is null;
  if not found then raise exception 'Receipt unavailable'; end if;
  select * into c from public.consultation_cases where user_id=f.user_id for update;
  select * into f from public.case_files where id=p_file for update;
  if not found or f.review_status<>'pending' or c.payment_status is distinct from 'pending_verification'
  then raise exception 'Already reviewed'; end if;
  if p_note is null or length(p_note)>1000 then raise exception 'Feedback is too long'; end if;
  update public.case_files set review_status=case when p_approve then 'approved' else 'rejected' end,
    review_note=trim(p_note),reviewed_by=auth.uid(),reviewed_at=now() where id=p_file;
  update public.consultation_cases set payment_status=case when p_approve then 'verified' else 'rejected' end,
    verified_at=case when p_approve then now() end,verified_by=case when p_approve then auth.uid() end
    where user_id=f.user_id;
  insert into public.audit_logs(actor_id,action,entity_id,metadata)
  values(auth.uid(),'payment.reviewed',p_file,jsonb_build_object('approved',p_approve));
  perform private.queue_admin_event('payment.reviewed',p_file);
end $$;
