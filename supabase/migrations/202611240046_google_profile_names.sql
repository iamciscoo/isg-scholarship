-- Google accounts arrive with a display name; keep it instead of an empty profile.
create or replace function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare given text; family text; whole text;
begin
  given := nullif(trim(coalesce(new.raw_user_meta_data ->> 'given_name', '')), '');
  family := nullif(trim(coalesce(new.raw_user_meta_data ->> 'family_name', '')), '');
  whole := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '');
  if given is null and whole is not null then
    given := split_part(whole, ' ', 1);
    family := coalesce(family, nullif(trim(substr(whole, length(given) + 1)), ''));
  end if;
  insert into public.profiles(id, first_name, last_name)
  values (new.id, coalesce(given, ''), coalesce(family, ''));
  insert into public.user_roles(user_id, role) values (new.id, 'applicant');
  -- Deliberately ignore all user-supplied role metadata.
  return new;
end $$;