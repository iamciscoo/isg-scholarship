alter table public.profiles add column avatar_path text check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$');
-- A profile can only point at a file in the owner's private folder.
create function public.set_profile_avatar(p_path text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.active_user() or split_part(p_path,'/',1)<>auth.uid()::text then raise exception 'Access denied'; end if;
  if not exists(select 1 from storage.objects where bucket_id='profile-avatars' and name=p_path) then raise exception 'Avatar unavailable'; end if;
  update public.profiles set avatar_path=p_path where id=auth.uid();
end $$;
revoke all on function public.set_profile_avatar(text) from public,anon;
grant execute on function public.set_profile_avatar(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('profile-avatars','profile-avatars',false,2097152,array['image/webp']) on conflict(id) do nothing;
create policy avatar_read_self on storage.objects for select to authenticated using (
  bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text and private.active_user());
create policy avatar_insert_self on storage.objects for insert to authenticated with check (
  bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text and private.active_user());
create policy avatar_delete_self on storage.objects for delete to authenticated using (
  bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text and private.active_user());
