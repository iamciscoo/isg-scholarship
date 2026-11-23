-- Automatic updates have explicit workflow contexts; authored announcements do not.
alter table public.account_notifications
 add column workflow_event text,
 add column workflow_entity uuid,
 add column workflow_context text,
 add column resolved_at timestamptz;
create index account_notifications_workflow on public.account_notifications(recipient_id,workflow_context)
 where workflow_context is not null;

create function private.notification_context(p_event text,p_entity uuid,p_user uuid,p_details jsonb,p_staff boolean)
returns text language plpgsql stable security definer set search_path='' as $$
declare applicant uuid:=p_user;target uuid;category text;
begin
 if p_staff then
  if p_event in ('payment.receipt_received','payment.reviewed') then return 'receipt:'||p_entity::text;end if;
  if p_event='application.document_received' then return 'file:'||p_entity::text;end if;
  if p_event like 'account.%' then return 'account:'||p_entity::text;end if;
  if p_details->>'userId' ~ '^[0-9a-f-]{36}$' then applicant:=(p_details->>'userId')::uuid;end if;
  if p_event='consultation.received' then
   select applicant_id into applicant from public.eligibility_assessments where id=p_entity;
  end if;
  if p_event in ('consultation.received','lead.updated') and applicant is not null
  then return 'consultation:'||applicant::text;end if;
  if p_event in ('application.form_received','application.reviewed','application.information_received') then
   if applicant is null then
    select user_id into applicant from public.application_declarations
     where id=case when p_details->>'applicationId' ~ '^[0-9a-f-]{36}$'
      then (p_details->>'applicationId')::uuid else p_entity end;
   end if;
   if applicant is not null then return 'form:'||applicant::text;end if;
  end if;
  if p_event in ('application.updated','package.accepted') then
   select id into target from public.study_applications where id=p_entity;
   if target is not null then return 'package-progress:'||target::text;end if;
  end if;
 else
  if p_event in ('payment_update','consultation.received') then return 'consultation-payment:'||p_user::text;end if;
  if p_event like 'full_application_%' or p_event='application_unlocked'
  then return 'form:'||p_user::text;end if;
  if p_event in ('package_recommended','package_payment_update','package_accepted','opportunity_proposed','application_update') then
   if p_details->>'applicationId' ~ '^[0-9a-f-]{36}$' then target:=(p_details->>'applicationId')::uuid;
   elsif p_event='package_payment_update' then select application_id into target from public.case_files where id=p_entity;
   else select id into target from public.study_applications where id=p_entity and user_id=p_user;end if;
   if target is not null then return 'package-payment:'||target::text;end if;
  end if;
  if p_event in ('document_request','document_update') then
   select case when count(*)=1 then min(r.category) end into category from public.document_requests r
    where r.user_id=p_user and r.label=p_details->>'documentName';
   if category is not null then return 'document:'||p_user::text||':'||category;end if;
  end if;
  if p_event='advisor_assigned' then return 'advisor:'||p_user::text;end if;
 end if;
 return null;
end $$;

-- Resolve only a newly inserted automated row. Replaying an old dedupe key cannot
-- mark a newer request read, and each context is serialized before insertion.
create function private.tag_workflow_notification(p_request uuid,p_event text,p_entity uuid,p_context text)
returns void language plpgsql security definer set search_path='' as $$
declare current_notice public.account_notifications;
begin
 update public.account_notifications set workflow_event=p_event,workflow_entity=p_entity,workflow_context=p_context
 where request_id=p_request and author_id is null and workflow_event is null returning * into current_notice;
 if not found or p_context is null then return;end if;
 update public.account_notifications set resolved_at=coalesce(resolved_at,clock_timestamp())
 where recipient_id=current_notice.recipient_id and workflow_context=p_context
  and workflow_event is not null and id<>current_notice.id;
end $$;

alter function private.notify_case_owner_with_details(uuid,text,uuid,jsonb) rename to insert_case_owner_notification;
create function private.notify_case_owner_with_details(p_user uuid,p_event text,p_key uuid,p_details jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare context text:=private.notification_context(p_event,p_key,p_user,p_details,false);
begin
 perform pg_advisory_xact_lock(hashtextextended('owner-notice:'||p_user::text||':'||coalesce(context,p_event),0));
 perform private.insert_case_owner_notification(p_user,p_event,p_key,p_details);
 perform private.tag_workflow_notification(md5('applicant:'||p_event||':'||p_key::text||':'||p_user::text)::uuid,
  'owner:'||p_event,p_key,context);
end $$;

alter function private.queue_admin_event_with_details(text,uuid,jsonb) rename to insert_admin_event_with_details;
create function private.queue_admin_event_with_details(p_event text,p_entity uuid,p_details jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare details jsonb;context text;recipient uuid;
begin
 details:=private.admin_notification_details(p_event,p_entity)||coalesce(p_details,'{}'::jsonb);
 context:=private.notification_context(p_event,p_entity,null,details,true);
 perform pg_advisory_xact_lock(hashtextextended('staff-notice:'||coalesce(context,p_event||':'||p_entity::text),0));
 perform private.insert_admin_event_with_details(p_event,p_entity,p_details);
 for recipient in select p.id from public.profiles p join public.user_roles r on r.user_id=p.id
  where p.status='active' and r.role='admin' loop
  perform private.tag_workflow_notification(md5('staff:'||p_event||':'||p_entity::text||':'||recipient::text)::uuid,
   'staff:'||p_event,p_entity,context);
 end loop;
end $$;

-- The initial owner notice is created outside the two normal event writers.
create or replace function private.consultation_received_inbox() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.applicant_id is not null and new.applicant_id is distinct from old.applicant_id then
  perform pg_advisory_xact_lock(hashtextextended('owner-notice:'||new.applicant_id::text||':consultation-payment:'||new.applicant_id::text,0));
  insert into public.account_notifications(title,body,link,recipient_id,request_id)
  values('Consultation received','Open Consultations for payment instructions and to upload your receipt.',
   '/dashboard/consultations',new.applicant_id,md5('consultation.received:'||new.id::text)::uuid)
  on conflict(request_id) do nothing;
  perform private.tag_workflow_notification(md5('consultation.received:'||new.id::text)::uuid,
   'owner:consultation.received',new.id,'consultation-payment:'||new.applicant_id::text);
 end if;
 return new;
end $$;

-- Fulfilled upload/review prompts are read even when there is no new owner message.
create function private.resolve_completed_workflow_notices(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.account_notifications n set resolved_at=coalesce(n.resolved_at,clock_timestamp())
 where n.author_id is null and n.workflow_event is not null and n.resolved_at is null and (
  (n.recipient_id=p_user and n.workflow_context='consultation-payment:'||p_user::text and exists(
   select 1 from public.consultation_cases c where c.user_id=p_user
    and c.payment_status in ('pending_verification','verified')
    and (n.workflow_event='owner:consultation.received'
     or n.workflow_event='owner:payment_update' and c.payment_status='pending_verification')))
  or (n.recipient_id=p_user and n.workflow_context like 'package-payment:%' and exists(
   select 1 from public.study_applications a where a.user_id=p_user
    and n.workflow_context='package-payment:'||a.id::text
    and a.package_state in ('pending_verification','paid')
    and (n.workflow_event in ('owner:package_recommended','owner:opportunity_proposed','owner:package_accepted')
     or n.workflow_event='owner:package_payment_update' and a.package_state='pending_verification')))
  or (n.recipient_id=p_user and n.workflow_context like 'document:'||p_user::text||':%' and exists(
   select 1 from public.case_files f where f.user_id=p_user and f.kind='document'
    and n.workflow_context='document:'||p_user::text||':'||f.category and f.created_at>n.created_at))
  or (n.workflow_event='staff:application.document_received' and exists(
   select 1 from public.case_files f where f.user_id=p_user and f.id=n.workflow_entity and f.review_status<>'pending'))
  or (n.workflow_event='staff:payment.receipt_received' and exists(
   select 1 from public.case_files f where f.user_id=p_user and f.id=n.workflow_entity and f.review_status<>'pending'))
  or (n.workflow_event='staff:consultation.received' and n.workflow_context='consultation:'||p_user::text and exists(
   select 1 from public.consultation_cases c where c.user_id=p_user and c.payment_status='verified'))
 );
end $$;
create function private.resolve_workflow_notice_state() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='case_files' and tg_op='INSERT' then
  if new.kind='document' then
   update public.account_notifications set resolved_at=coalesce(resolved_at,clock_timestamp())
    where recipient_id=new.user_id and workflow_context='document:'||new.user_id::text||':'||new.category
     and workflow_event in ('owner:document_request','owner:document_update');
  end if;
 end if;
 perform private.resolve_completed_workflow_notices(new.user_id);return new;
end $$;
create trigger resolve_file_notices after insert or update of review_status on public.case_files
 for each row execute function private.resolve_workflow_notice_state();
create trigger resolve_payment_notices after update of payment_status on public.consultation_cases
 for each row execute function private.resolve_workflow_notice_state();
create trigger resolve_package_notices after update of package_state on public.study_applications
 for each row execute function private.resolve_workflow_notice_state();

-- Backfill only IDs produced by known automatic writers; manual messages remain untouched.
do $$
declare entry record;owner uuid;entity uuid;context text;
begin
 for entry in select * from private.notification_outbox loop
  if split_part(entry.dedupe_key,':',2) !~ '^[0-9a-f-]{36}$' then continue;end if;
  entity:=split_part(entry.dedupe_key,':',2)::uuid;
  for owner in select n.recipient_id from public.account_notifications n
   where n.author_id is null and n.recipient_id is not null
    and n.request_id=md5('applicant:'||entry.event||':'||entity::text||':'||n.recipient_id::text)::uuid loop
   context:=private.notification_context(entry.event,entity,owner,entry.payload,false);
   update public.account_notifications set workflow_event='owner:'||entry.event,workflow_entity=entity,workflow_context=context
    where author_id is null and recipient_id=owner and request_id=md5('applicant:'||entry.event||':'||entity::text||':'||owner::text)::uuid;
  end loop;
 end loop;
 for entry in select distinct on (event,entity_id) event,entity_id,payload from private.integration_events order by event,entity_id,created_at desc loop
  context:=private.notification_context(entry.event,entry.entity_id,null,entry.payload,true);
  update public.account_notifications n set workflow_event='staff:'||entry.event,workflow_entity=entry.entity_id,workflow_context=context
   where n.author_id is null and n.recipient_id is not null
    and n.request_id=md5('staff:'||entry.event||':'||entry.entity_id::text||':'||n.recipient_id::text)::uuid;
 end loop;
 update public.account_notifications n set workflow_event='owner:consultation.received',workflow_entity=a.id,
  workflow_context='consultation-payment:'||a.applicant_id::text
 from public.eligibility_assessments a where a.applicant_id=n.recipient_id and n.author_id is null
  and n.request_id=md5('consultation.received:'||a.id::text)::uuid;
 -- Legacy rows from one transaction can share a timestamp. Keep tied updates
 -- unread rather than using random UUID order to hide a potentially newer request.
 with ranked as (
  select id,created_at,max(created_at) over(partition by recipient_id,workflow_context) latest
  from public.account_notifications where workflow_context is not null and workflow_event is not null
 ) update public.account_notifications n set resolved_at=coalesce(n.resolved_at,clock_timestamp())
 from ranked r where n.id=r.id and r.created_at<r.latest;
 for owner in select user_id from public.consultation_cases loop
  perform private.resolve_completed_workflow_notices(owner);
 end loop;
end $$;

-- Keep receipt tasks and inbox shape; resolved history is visible but no longer unread.
alter function public.account_notification_inbox() set schema private;
alter function private.account_notification_inbox() rename to notification_inbox_base;
create function public.account_notification_inbox() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;items jsonb;unread bigint;
begin
 result:=private.notification_inbox_base();
 select coalesce(jsonb_agg(item.value||jsonb_build_object(
  'is_read',(item.value->>'is_read')::boolean or n.resolved_at is not null,
  'is_system',n.workflow_event is not null) order by item.ordinality),'[]'::jsonb)
 into items from jsonb_array_elements(result->'items') with ordinality item(value,ordinality)
 join public.account_notifications n on n.id=(item.value->>'id')::uuid;
 select count(*) into unread from public.account_notifications n
 where (n.recipient_id is null or n.recipient_id=auth.uid()) and n.resolved_at is null
  and not exists(select 1 from public.notification_reads r where r.notification_id=n.id and r.user_id=auth.uid());
 return result||jsonb_build_object('items',items,'unread',unread);
end $$;
revoke all on function public.account_notification_inbox() from public,anon,authenticated;
grant execute on function public.account_notification_inbox() to authenticated;
revoke all on function private.notification_context(text,uuid,uuid,jsonb,boolean),
 private.tag_workflow_notification(uuid,text,uuid,text),private.insert_case_owner_notification(uuid,text,uuid,jsonb),
 private.notify_case_owner_with_details(uuid,text,uuid,jsonb),private.insert_admin_event_with_details(text,uuid,jsonb),
 private.queue_admin_event_with_details(text,uuid,jsonb),private.resolve_completed_workflow_notices(uuid),
 private.resolve_workflow_notice_state(),private.notification_inbox_base()
 from public,anon,authenticated;
