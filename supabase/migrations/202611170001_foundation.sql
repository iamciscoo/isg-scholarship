-- Phase 1 only. No real people or scholarship data is seeded.
create schema if not exists private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
revoke all on schema private from public, anon, authenticated;

create type public.staff_role as enum ('applicant', 'advisor', 'admin');
create type public.lead_stage as enum ('new', 'under_review', 'qualified', 'more_information', 'not_currently_eligible', 'converted', 'closed');
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  first_name text not null default '' check (length(first_name) <= 80),
  last_name text not null default '' check (length(last_name) <= 80),
  phone text not null default '' check (length(phone) <= 25),
  nationality text not null default '' check (length(nationality) <= 80),
  residence text not null default '' check (length(residence) <= 80),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid primary key references public.profiles on delete cascade,
  role public.staff_role not null default 'applicant'
);
create table public.eligibility_assessments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('ISG-' || upper(encode(extensions.gen_random_bytes(6), 'hex'))),
  applicant_id uuid references public.profiles on delete set null,
  email text not null check (email = lower(email) and length(email) <= 254),
  first_name text not null, last_name text not null, phone text not null,
  nationality text not null, residence text not null,
  qualification text not null, education_status text not null,
  field_of_study text not null, performance text not null,
  graduation_year integer not null check (graduation_year between 1950 and 2099),
  english_status text not null,
  study_level text not null check (study_level in ('Undergraduate', 'Master''s', 'PhD / Research')),
  preferred_fields text not null, destinations text not null default '',
  intake text not null, funding text not null, constraints_note text not null default '',
  idempotency_key uuid not null unique, payload_hash text not null,
  created_at timestamptz not null default now()
);
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.eligibility_assessments on delete cascade,
  stage public.lead_stage not null default 'new',
  advisor_id uuid references public.profiles,
  follow_up date, source text not null default 'website',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table private.lead_notes (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads on delete cascade,
  author_id uuid not null references public.profiles, stage public.lead_stage not null,
  reason text not null check (length(reason) between 5 and 1500), created_at timestamptz not null default now()
);
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.eligibility_assessments on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  purpose text not null check (purpose in ('assessment_processing', 'marketing', 'adult_confirmation', 'account_terms')),
  granted boolean not null, policy_version text not null default '2026-11-17-prelaunch',
  created_at timestamptz not null default now()
);
create table public.contact_enquiries (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null,
  topic text not null, message text not null check (length(message) between 10 and 2000),
  idempotency_key uuid not null unique, payload_hash text not null,
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles on delete set null,
  action text not null, entity_id uuid, metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table private.notification_outbox (
  id uuid primary key default gen_random_uuid(), assessment_id uuid references public.eligibility_assessments on delete cascade,
  event text not null, recipient text not null, payload jsonb not null,
  dedupe_key text not null unique, state text not null default 'pending' check (state in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0, available_at timestamptz not null default now(),
  lease_id uuid, lease_until timestamptz, provider_id text, last_error text,
  created_at timestamptz not null default now(), sent_at timestamptz
);
create table private.rate_limits (key text primary key, count integer not null, window_start timestamptz not null);
create index assessments_applicant_idx on public.eligibility_assessments(applicant_id);
create index assessments_email_idx on public.eligibility_assessments(email);
create index leads_advisor_stage_idx on public.leads(advisor_id, stage);
create index leads_created_idx on public.leads(created_at desc);
create index outbox_pending_idx on private.notification_outbox(state, available_at);
create index notes_lead_idx on private.lead_notes(lead_id, created_at);
create index audit_created_idx on public.audit_logs(created_at desc);

create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function private.touch_updated_at();
create trigger leads_updated before update on public.leads for each row execute function private.touch_updated_at();
create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values(new.id);
  insert into public.user_roles(user_id,role) values(new.id,'applicant');
  -- Deliberately ignore all user-supplied role metadata.
  return new;
end $$;
create trigger auth_user_created after insert on auth.users for each row execute function private.create_profile();

create function private.active_user() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p join auth.users u on u.id=p.id
    where p.id=auth.uid() and p.status='active' and u.email_confirmed_at is not null);
$$;
create function private.has_role(roles public.staff_role[]) returns boolean language sql stable security definer set search_path = '' as $$
  select private.active_user() and coalesce(auth.jwt()->>'aal','')='aal2' and exists(
    select 1 from public.user_roles r where r.user_id=auth.uid() and r.role=any(roles));
$$;
create function private.can_review(lead_uuid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_role(array['admin']::public.staff_role[]) or (
    private.has_role(array['advisor']::public.staff_role[]) and exists(select 1 from public.leads l where l.id=lead_uuid and l.advisor_id=auth.uid()));
$$;
create function private.can_read_assessment(assessment_uuid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.active_user() and (exists(select 1 from public.eligibility_assessments a where a.id=assessment_uuid and a.applicant_id=auth.uid())
    or exists(select 1 from public.leads l where l.assessment_id=assessment_uuid and private.can_review(l.id)));
$$;
grant usage on schema private to authenticated;
grant execute on function private.active_user(), private.has_role(public.staff_role[]), private.can_review(uuid), private.can_read_assessment(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.eligibility_assessments enable row level security;
alter table public.leads enable row level security;
alter table public.consent_records enable row level security;
alter table public.contact_enquiries enable row level security;
alter table public.audit_logs enable row level security;
alter table private.lead_notes enable row level security;
alter table private.notification_outbox enable row level security;
alter table private.rate_limits enable row level security;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;
grant select on public.profiles, public.user_roles, public.eligibility_assessments, public.leads, public.consent_records, public.audit_logs, public.contact_enquiries to authenticated;
grant update(first_name,last_name,phone,nationality,residence) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (
  id=auth.uid() or private.has_role(array['admin']::public.staff_role[]) or
  (private.has_role(array['advisor']::public.staff_role[]) and exists(select 1 from public.eligibility_assessments a join public.leads l on l.assessment_id=a.id where a.applicant_id=profiles.id and l.advisor_id=auth.uid()))
);
create policy profiles_edit_self on public.profiles for update to authenticated using(id=auth.uid() and private.active_user()) with check(id=auth.uid() and private.active_user());
create policy roles_read on public.user_roles for select to authenticated using(user_id=auth.uid() or private.has_role(array['admin']::public.staff_role[]));
create policy assessment_read on public.eligibility_assessments for select to authenticated using(private.can_read_assessment(id));
create policy leads_read on public.leads for select to authenticated using(private.can_review(id));
create policy consents_read on public.consent_records for select to authenticated using(
  private.active_user() and (user_id=auth.uid() or (assessment_id is not null and private.can_read_assessment(assessment_id)))
);
create policy audit_admin_read on public.audit_logs for select to authenticated using(private.has_role(array['admin']::public.staff_role[]));
create policy enquiries_admin_read on public.contact_enquiries for select to authenticated using(private.has_role(array['admin']::public.staff_role[]));

-- Revoke default function privileges; grant each public RPC explicitly in later migrations.
revoke execute on all functions in schema private from public, anon;
alter default privileges in schema private revoke execute on functions from public;
