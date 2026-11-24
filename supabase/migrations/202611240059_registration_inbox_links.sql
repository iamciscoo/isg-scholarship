alter table public.account_notifications drop constraint account_notifications_link_check;
alter table public.account_notifications add constraint account_notifications_link_check check(
  link='' or link ~ '^/(dashboard(/profile|/consultations|/application|/applications(/[0-9a-f-]{36})?)?|eligibility|contact|pathways|how-it-works|services|pricing|faqs|admin/(inbox|enquiries|consultations|payments|applications|settings|users)|admin/(receipts|declarations|cases|applications|users)/[0-9a-f-]{36})$'
);

create or replace function private.insert_admin_event_with_details(p_event text,p_entity uuid,p_details jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare settings private.integration_settings; details jsonb; destination text; heading text; body text;
begin
  select * into settings from private.integration_settings where id;
  details:=private.admin_notification_details(p_event,p_entity)
    || coalesce(jsonb_strip_nulls(p_details),'{}'::jsonb);
  if details->>'userId' ~ '^[0-9a-f-]{36}$' then
    details:=coalesce(private.case_notification_details((details->>'userId')::uuid),'{}'::jsonb)||details;
  end if;
  destination:=case
    when p_event='enquiry.received' then '/admin/enquiries'
    when p_event like 'account.%' then '/admin/users/'||p_entity::text
    when p_event in ('payment.receipt_received','payment.reviewed') then '/admin/receipts/'||p_entity::text
    when p_event='application.form_received' then '/admin/declarations/'||p_entity::text
    when p_event in ('application.reviewed','application.document_received','application.information_received')
      and details->>'applicationId' ~ '^[0-9a-f-]{36}$'
      then '/admin/declarations/'||(details->>'applicationId')
    when details->>'path' ~ '^/admin/applications/[0-9a-f-]{36}$' then details->>'path'
    when details->>'userId' ~ '^[0-9a-f-]{36}$' then '/admin/cases/'||(details->>'userId')
    when p_event like 'application.%' or p_event='package.accepted' then '/admin/applications'
    else '/admin/consultations' end;
  heading:=case p_event
    when 'enquiry.received' then 'New advisor enquiry'
    when 'account.created' then 'New student account'
    when 'consultation.received' then 'Consultation submitted'
    when 'consultation.support_received' then 'Consultation supporting file received'
    when 'payment.receipt_received' then 'Payment receipt to review'
    when 'payment.reviewed' then 'Payment receipt reviewed'
    when 'meeting.requested' then 'Consultation meeting requested'
    when 'meeting.scheduled' then 'Consultation meeting scheduled'
    when 'meeting.completed' then 'Consultation meeting completed'
    when 'whatsapp_call.requested' then 'WhatsApp consultation requested'
    when 'whatsapp_call.cancelled' then 'WhatsApp consultation request cancelled'
    when 'application.unlocked' then 'Scholarship application unlocked'
    when 'application.form_received' then 'Application form received'
    when 'application.reviewed' then 'Scholarship application reviewed'
    when 'application.document_received' then 'Application document received'
    when 'application.information_received' then 'Requested application information received'
    else 'New ISG workspace update' end;
  body:=concat_ws(' · ',nullif(details->>'applicantName',''),nullif(details->>'reference',''),
    nullif(details->>'status',''),nullif(details->>'documentName',''));
  details:=details||jsonb_build_object('path',destination);

  insert into private.integration_events(channel,event,entity_id,recipient,payload)
  select 'email',p_event,p_entity,target,details from unnest(settings.admin_emails) target
  on conflict do nothing;
  if settings.whatsapp_group<>'' then
    insert into private.integration_events(channel,event,entity_id,recipient,payload)
    values('whatsapp',p_event,p_entity,settings.whatsapp_group,details) on conflict do nothing;
  end if;
  insert into public.account_notifications(title,body,link,recipient_id,request_id)
  select heading,case when length(body)>=5 then left(body,2000) else 'Open the private workspace for details.' end,
    destination,p.id,md5('staff:'||p_event||':'||p_entity::text||':'||p.id::text)::uuid
  from public.profiles p join public.user_roles r on r.user_id=p.id where p.status='active' and r.role='admin'
  on conflict(request_id) do nothing;
end $$;

-- Repair existing alerts in the bell, including rows created before workflow tagging.
update public.account_notifications n
set link='/admin/users/'||u.id::text
from auth.users u
where n.author_id is null and n.link='/admin/settings'
  and (
    (n.workflow_event in ('staff:account.created','staff:account.verified') and n.workflow_entity=u.id)
    or n.request_id in (
      md5('staff:account.created:'||u.id::text||':'||n.recipient_id::text)::uuid,
      md5('staff:account.verified:'||u.id::text||':'||n.recipient_id::text)::uuid
    )
  );

-- An older account alert may refer to an account that has since been removed.
update public.account_notifications
set link='/admin/users'
where author_id is null and link='/admin/settings'
  and (title='New student account' or workflow_event in ('staff:account.created','staff:account.verified'));
