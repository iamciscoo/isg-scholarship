alter table public.account_notifications drop constraint account_notifications_link_check;
alter table public.account_notifications add constraint account_notifications_link_check check(link='' or link ~ '^/(dashboard(/profile)?|eligibility|contact|pathways|how-it-works|services|pricing|faqs|admin/(inbox|enquiries|consultations|payments|applications|settings)|admin/(receipts|declarations)/[0-9a-f-]{36})$');

create or replace function private.queue_admin_event(p_event text,p_entity uuid) returns void language plpgsql security definer set search_path='' as $$
declare settings private.integration_settings; target text; destination text; heading text;
begin
 select * into settings from private.integration_settings where id=true;
 foreach target in array settings.admin_emails loop
  insert into private.integration_events(channel,event,entity_id,recipient) values('email',p_event,p_entity,target) on conflict do nothing;
 end loop;
 if settings.whatsapp_group<>'' then insert into private.integration_events(channel,event,entity_id,recipient) values('whatsapp',p_event,p_entity,settings.whatsapp_group) on conflict do nothing; end if;
 destination:=case when p_event='enquiry.received' then '/admin/enquiries' when p_event like 'account.%' then '/admin/settings' when p_event='payment.receipt_received' then '/admin/receipts/'||p_entity::text when p_event='payment.reviewed' then '/admin/payments' when p_event='application.form_received' then '/admin/declarations/'||p_entity::text when p_event like 'application.%' or p_event='package.accepted' then '/admin/applications' else '/admin/consultations' end;
 heading:=case p_event when 'enquiry.received' then 'New advisor enquiry' when 'account.created' then 'New student account' when 'payment.receipt_received' then 'Payment receipt to review' when 'meeting.requested' then 'Advisor meeting requested' when 'application.form_received' then 'Application form received' else 'New ISG workspace update' end;
 insert into public.account_notifications(title,body,link,recipient_id,author_id,request_id)
 select heading,'A new update needs your attention. Open the private workspace for details.',destination,p.id,null,md5('staff:'||p_event||':'||p_entity::text||':'||p.id::text)::uuid
 from public.profiles p join public.user_roles r on r.user_id=p.id where p.status='active' and r.role='admin'
 on conflict(request_id) do nothing;
end $$;
create function private.enquiry_staff_event() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.queue_admin_event('enquiry.received',new.id);return new;end $$;
create trigger enquiry_staff_notification after insert on public.contact_enquiries for each row execute function private.enquiry_staff_event();
revoke all on function private.enquiry_staff_event() from public,anon,authenticated;

update private.opportunities set image=regexp_replace(image,'\.(jpg|jpeg|png)$','.webp') where image ~ '^/images/[a-zA-Z0-9_-]+\.(jpg|jpeg|png)$';
update public.study_promotions set image=regexp_replace(image,'\.(jpg|jpeg|png)$','.webp') where image ~ '^/images/[a-zA-Z0-9_-]+\.(jpg|jpeg|png)$';
update public.site_presentation set hero_image=regexp_replace(hero_image,'\.(jpg|jpeg|png)$','.webp') where hero_image ~ '^/images/[a-zA-Z0-9_-]+\.(jpg|jpeg|png)$';
alter table public.site_presentation alter column hero_image set default '/images/study-together.webp';
create or replace function private.valid_marketing_image(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select p_path ~ '^/images/[a-zA-Z0-9_-]+\.webp$' or exists(select 1 from public.marketing_images m where p_path='/api/marketing-images/'||m.id::text);
$$;
