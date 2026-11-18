create table public.marketing_images(
 id uuid primary key,storage_path text not null unique,label text not null check(length(trim(label)) between 1 and 140),
 created_by uuid not null references public.profiles,created_at timestamptz not null default now(),
 check(storage_path=id::text||'.webp')
);
create table public.site_presentation(id boolean primary key default true check(id),hero_image text not null default '/images/study-together.jpg',updated_at timestamptz not null default now());
insert into public.site_presentation(id) values(true);
alter table public.marketing_images enable row level security;
alter table public.site_presentation enable row level security;
revoke all on public.marketing_images,public.site_presentation from public,anon,authenticated;
grant select on public.marketing_images,public.site_presentation to anon,authenticated;
create policy marketing_images_read on public.marketing_images for select to anon,authenticated using(true);
create policy presentation_read on public.site_presentation for select to anon,authenticated using(true);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('marketing-images','marketing-images',true,3145728,array['image/webp']) on conflict(id) do nothing;
-- No direct browser writes: the server validates active admin role and sanitizes pixels first.
create function private.valid_marketing_image(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select p_path ~ '^/images/[a-zA-Z0-9_-]+\.(jpg|png|webp)$' or exists(select 1 from public.marketing_images m where p_path='/api/marketing-images/'||m.id::text);
$$;
create function public.register_marketing_image(p_id uuid,p_actor uuid,p_label text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles p join public.user_roles r on r.user_id=p.id where p.id=p_actor and p.status='active' and r.role='admin') then raise exception 'Access denied';end if;
 if not exists(select 1 from storage.objects where bucket_id='marketing-images' and name=p_id::text||'.webp') then raise exception 'Image unavailable';end if;
 insert into public.marketing_images(id,storage_path,label,created_by) values(p_id,p_id::text||'.webp',trim(p_label),p_actor);
 insert into public.audit_logs(actor_id,action,entity_id) values(p_actor,'marketing.image_uploaded',p_id);
end $$;
create function public.set_homepage_image(p_image text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied';end if;
 if not private.valid_marketing_image(p_image) then raise exception 'Choose an approved image';end if;
 update public.site_presentation set hero_image=p_image,updated_at=now() where id;
 insert into public.audit_logs(actor_id,action) values(auth.uid(),'website.hero_image_updated');
end $$;
alter table private.opportunities drop constraint opportunities_image_check;
alter table private.opportunities add constraint opportunities_image_check check(private.valid_marketing_image(image));
alter table public.study_promotions drop constraint study_promotions_image_check;
alter table public.study_promotions add constraint study_promotions_image_check check(private.valid_marketing_image(image));
alter table public.site_presentation add constraint presentation_image_check check(private.valid_marketing_image(hero_image));
revoke all on function private.valid_marketing_image(text),public.register_marketing_image(uuid,uuid,text),public.set_homepage_image(text) from public,anon,authenticated;
grant execute on function public.register_marketing_image(uuid,uuid,text) to service_role;
grant execute on function public.set_homepage_image(text) to authenticated;
