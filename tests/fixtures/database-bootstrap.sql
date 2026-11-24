-- Tests only: a minimal Supabase identity contract on real PostgreSQL.
-- These fixtures never run in development or production.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,
  raw_user_meta_data jsonb default '{}',created_at timestamptz default now(),last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}')$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on all functions in schema auth to anon,authenticated,service_role;
-- Minimal test-only Storage RLS contract; hosted Supabase owns its real schema.
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
grant usage on schema storage to authenticated;
grant select,insert,delete on storage.objects to authenticated;
