create table private.integration_settings(id boolean primary key default true check(id),admin_emails text[] not null default '{}',whatsapp_group text not null default '');
insert into private.integration_settings(id,admin_emails,whatsapp_group) values(true,array[]::text[],'');
create table private.integration_events(
 id uuid primary key default gen_random_uuid(),channel text not null check(channel in('email','whatsapp')),
 event text not null,entity_id uuid not null,recipient text not null,state text not null default 'pending' check(state in('pending','sending','sent','failed','uncertain')),
 attempts integer not null default 0,available_at timestamptz not null default now(),lease_id uuid,lease_until timestamptz,provider_id text,last_error text,created_at timestamptz not null default now(),
 unique(channel,event,entity_id,recipient)
);
create function private.queue_admin_event(p_event text,p_entity uuid) returns void language plpgsql security definer set search_path='' as $$
declare settings private.integration_settings; target text;
begin
 select * into settings from private.integration_settings where id=true;
 foreach target in array settings.admin_emails loop
  insert into private.integration_events(channel,event,entity_id,recipient) values('email',p_event,p_entity,target) on conflict do nothing;
 end loop;
 if settings.whatsapp_group<>'' then insert into private.integration_events(channel,event,entity_id,recipient) values('whatsapp',p_event,p_entity,settings.whatsapp_group) on conflict do nothing; end if;
end $$;
create function private.account_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null and (tg_op='INSERT' or old.email_confirmed_at is null) then perform private.queue_admin_event('account.verified',new.id); end if;
 return new;
end $$;
create trigger account_admin_alert after insert or update of email_confirmed_at on auth.users for each row execute function private.account_event();
create function private.consultation_event() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.queue_admin_event('consultation.received',new.id); return new; end $$;
create trigger consultation_admin_alert after insert on public.eligibility_assessments for each row execute function private.consultation_event();
create function private.lead_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.stage is distinct from old.stage or new.advisor_id is distinct from old.advisor_id then perform private.queue_admin_event('lead.updated',gen_random_uuid()); end if;
 return new;
end $$;
create trigger lead_admin_alert after update on public.leads for each row execute function private.lead_event();
create function public.admin_alert_settings() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
 return (select jsonb_build_object('emails',admin_emails,'whatsapp_group',whatsapp_group,'delivery',(select coalesce(jsonb_agg(t),'[]'::jsonb) from (select channel,state,count(*) from private.integration_events group by channel,state)t)) from private.integration_settings where id=true);
end $$;
create function public.save_admin_alert_emails(p_emails text[]) returns void language plpgsql security definer set search_path='' as $$
declare target text;
begin
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
 if coalesce(cardinality(p_emails),0)>10 then raise exception 'Up to 10 addresses'; end if;
 foreach target in array p_emails loop if length(target)>254 or target !~ '^[A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then raise exception 'Invalid email'; end if; end loop;
 update private.integration_settings set admin_emails=p_emails where id=true;
 insert into public.audit_logs(actor_id,action,metadata) values(auth.uid(),'alerts.recipients_changed',jsonb_build_object('count',cardinality(p_emails)));
end $$;
create function public.claim_integration_events(p_email boolean,p_whatsapp boolean) returns setof private.integration_events language plpgsql security definer set search_path='' as $$
begin
 -- Green API has no idempotency guarantee: ambiguous sends require manual review.
 update private.integration_events set state='uncertain',last_error='worker_interrupted' where state='sending' and lease_until<now();
 return query with candidates as(select id from private.integration_events where state='pending' and available_at<=now() and ((channel='email' and p_email) or (channel='whatsapp' and p_whatsapp)) order by created_at for update skip locked limit 10)
 update private.integration_events e set state='sending',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes' from candidates c where e.id=c.id returning e.*;
end $$;
create function public.finish_integration_event(p_id uuid,p_lease uuid,p_provider text,p_state text,p_error text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_state not in('sent','failed','uncertain') then raise exception 'Invalid state'; end if;
 update private.integration_events set state=p_state,provider_id=p_provider,last_error=p_error,lease_until=null where id=p_id and lease_id=p_lease and state='sending';
end $$;
revoke all on function public.admin_alert_settings(),public.save_admin_alert_emails(text[]),public.claim_integration_events(boolean,boolean),public.finish_integration_event(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_alert_settings(),public.save_admin_alert_emails(text[]) to authenticated;
grant execute on function public.claim_integration_events(boolean,boolean),public.finish_integration_event(uuid,uuid,text,text,text) to service_role;
alter table private.integration_settings enable row level security;
alter table private.integration_events enable row level security;
revoke all on private.integration_settings,private.integration_events from public,anon,authenticated;
revoke all on function private.queue_admin_event(text,uuid),private.account_event(),private.consultation_event(),private.lead_event() from public,anon,authenticated;
