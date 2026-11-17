-- Registration uses email/password without an email-confirmation requirement.
-- Ownership is always the authenticated account ID; email matching never imports older records.
create or replace function private.active_user() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=auth.uid() and p.status='active');
$$;
create or replace function public.link_my_assessments() returns void language plpgsql security definer set search_path='' as $$
begin if not private.active_user() then raise exception 'Access denied'; end if; end $$;
create table public.consultation_drafts(
 user_id uuid primary key references public.profiles on delete cascade,
 data jsonb not null default '{}' check(jsonb_typeof(data)='object' and octet_length(data::text)<=12000),
 step integer not null default 1 check(step between 1 and 3),updated_at timestamptz not null default now()
);
alter table public.consultation_drafts enable row level security;
grant select,insert,update,delete on public.consultation_drafts to authenticated;
create policy consultation_drafts_self on public.consultation_drafts to authenticated
 using(user_id=auth.uid() and private.active_user()) with check(user_id=auth.uid() and private.active_user());
create function public.submit_my_consultation(p_data jsonb,p_key uuid,p_hash text,p_user uuid,p_team_email text default '') returns text
language plpgsql security definer set search_path='' as $$
declare result text; record public.eligibility_assessments; account_email text;
begin
 select u.email into account_email from auth.users u join public.profiles p on p.id=u.id where u.id=p_user and p.status='active';
 if account_email is null or lower(p_data->>'email')<>lower(account_email) then raise exception 'Account unavailable'; end if;
 -- Prefix the hash with the owner so a guessed retry key cannot attach someone else's submission.
 result:=public.submit_assessment(p_data,p_key,p_user::text||':'||p_hash,p_team_email);
 select * into record from public.eligibility_assessments where idempotency_key=p_key for update;
 if record.applicant_id is not null and record.applicant_id<>p_user then raise exception 'Access denied'; end if;
 update public.eligibility_assessments set applicant_id=p_user where id=record.id;
 update public.profiles set first_name=record.first_name,last_name=record.last_name,phone=record.phone,nationality=record.nationality,residence=record.residence where id=p_user;
 delete from public.consultation_drafts where user_id=p_user;
 return result;
end $$;
revoke all on function public.submit_my_consultation(jsonb,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.submit_my_consultation(jsonb,uuid,text,uuid,text) to service_role;
create function public.my_consultations() returns table(id uuid,reference text,study_level text,preferred_fields text,created_at timestamptz,stage public.lead_stage)
language plpgsql security definer set search_path='' as $$
begin
 if not private.active_user() then raise exception 'Access denied'; end if;
 return query select a.id,a.reference,a.study_level,a.preferred_fields,a.created_at,l.stage from public.eligibility_assessments a join public.leads l on l.assessment_id=a.id where a.applicant_id=auth.uid() order by a.created_at desc limit 100;
end $$;
revoke all on function public.my_consultations() from public,anon;
grant execute on function public.my_consultations() to authenticated;
create or replace function public.staff_accounts() returns table(id uuid,email text,first_name text,last_name text,role public.staff_role,status text)
language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
 return query select p.id,u.email::text,p.first_name,p.last_name,r.role,p.status from public.profiles p join auth.users u on u.id=p.id join public.user_roles r on r.user_id=p.id order by p.created_at desc limit 500;
end $$;
create or replace function public.assign_staff_role(p_user uuid,p_role public.staff_role) returns void
language plpgsql security definer set search_path='' as $$
declare old_role public.staff_role;
begin
 perform pg_advisory_xact_lock(817170008);
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
 select role into old_role from public.user_roles where user_id=p_user for update;
 if not found or not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=p_user and p.status='active') then raise exception 'Account unavailable'; end if;
 if old_role='admin' and p_role<>'admin' and (select count(*) from public.user_roles r join public.profiles p on p.id=r.user_id where r.role='admin' and p.status='active')<=1 then raise exception 'Keep at least one administrator'; end if;
 update public.user_roles set role=p_role where user_id=p_user;
 insert into public.audit_logs(actor_id,action,entity_id,metadata) values(auth.uid(),'staff.role_assigned',p_user,jsonb_build_object('from',old_role,'to',p_role));
end $$;
create or replace function private.account_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then perform private.queue_admin_event('account.created',new.id); end if;
 return new;
end $$;
