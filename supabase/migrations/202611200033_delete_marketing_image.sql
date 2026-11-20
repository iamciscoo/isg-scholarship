-- Admins can remove an uploaded public image; refuse while it is still referenced.
create or replace function public.delete_marketing_image(p_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare path text;
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  select storage_path into path from public.marketing_images where id=p_id;
  if path is null then raise exception 'Image not found'; end if;
  if exists(select 1 from public.site_presentation where hero_image='/api/marketing-images/'||p_id::text) then
    raise exception 'This image is the homepage hero. Choose another hero first.';
  end if;
  if exists(select 1 from public.study_promotions where image='/api/marketing-images/'||p_id::text) then
    raise exception 'This image is used by a public promotion. Change that promotion first.';
  end if;
  if exists(select 1 from private.opportunities where image='/api/marketing-images/'||p_id::text) then
    raise exception 'This image is used by a scholarship package. Change that package first.';
  end if;
  delete from public.marketing_images where id=p_id;
  insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'marketing.image_deleted',p_id);
  return path;
end $$;
revoke all on function public.delete_marketing_image(uuid) from public,anon;
grant execute on function public.delete_marketing_image(uuid) to authenticated;
