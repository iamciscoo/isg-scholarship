-- Track accounts that have a password so the profile can offer "set" vs "change".
alter table public.profiles add column if not exists password_set_at timestamptz;