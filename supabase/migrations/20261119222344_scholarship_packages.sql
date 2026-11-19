-- Use the existing private catalogue and application IDs. Previously accepted quotes stay intact.
alter table private.opportunities
  add column support_summary text not null default '' check(length(support_summary) <= 3000),
  add column package_fee_tzs integer check(package_fee_tzs between 0 and 100000000),
  add column private_image_id uuid;
alter table private.opportunities alter column source_url drop not null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('scholarship-images','scholarship-images',false,3145728,array['image/webp'])
on conflict(id) do nothing;

create function public.save_scholarship_package(p_id uuid,p_data jsonb,p_image_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  if p_image_id is not null and not exists (
    select 1 from storage.objects where bucket_id='scholarship-images' and name=p_image_id::text||'.webp'
  ) then raise exception 'Image unavailable'; end if;
  if p_data->>'packageFee' is null or not coalesce(private.valid_marketing_image(p_data->>'image'),false) then
    raise exception 'Enter a package fee and choose an image';
  end if;
  if p_id is null then
    insert into private.opportunities(
      name,provider,destination,study_level,field,requirements,deadline,provider_fee,provider_currency,
      image,active,support_summary,package_fee_tzs,private_image_id
    ) values (
      p_data->>'name',p_data->>'provider',p_data->>'destination',p_data->>'studyLevel',p_data->>'field',
      p_data->>'requirements',nullif(p_data->>'deadline','')::date,nullif(p_data->>'providerFee','')::numeric,
      p_data->>'providerCurrency',p_data->>'image',(p_data->>'active')::boolean,
      p_data->>'supportSummary',(p_data->>'packageFee')::integer,p_image_id
    ) returning id into result;
  else
    update private.opportunities set
      name=p_data->>'name',provider=p_data->>'provider',destination=p_data->>'destination',
      study_level=p_data->>'studyLevel',field=p_data->>'field',requirements=p_data->>'requirements',
      deadline=nullif(p_data->>'deadline','')::date,provider_fee=nullif(p_data->>'providerFee','')::numeric,
      provider_currency=p_data->>'providerCurrency',image=p_data->>'image',active=(p_data->>'active')::boolean,
      support_summary=p_data->>'supportSummary',package_fee_tzs=(p_data->>'packageFee')::integer,
      private_image_id=case when (p_data->>'useGallery')::boolean then null
        else coalesce(p_image_id,private_image_id) end,
      updated_at=now()
    where id=p_id returning id into result;
    if not found then raise exception 'Package unavailable'; end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_id)
  values(auth.uid(),'scholarship_package.saved',result);
  return result;
end $$;

create or replace function public.staff_opportunity_choices()
returns table(id uuid,name text,provider text,destination text,study_level text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.has_role(array['admin','advisor']::public.staff_role[]) then raise exception 'Access denied'; end if;
  return query select o.id,o.name,o.provider,o.destination,o.study_level
  from private.opportunities o where o.active and o.package_fee_tzs is not null
    and (o.deadline is null or o.deadline>=current_date) order by o.name;
end $$;

create or replace function public.propose_application(p_user uuid,p_opportunity uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare o private.opportunities; result uuid;
begin
  if not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(p_user) then
    raise exception 'Access denied';
  end if;
  if not exists(select 1 from public.consultation_cases where user_id=p_user and payment_status='verified' and completed_at is not null) then
    raise exception 'Consultation required';
  end if;
  select * into o from private.opportunities where id=p_opportunity and active and package_fee_tzs is not null;
  if not found or (o.deadline is not null and o.deadline<current_date) then raise exception 'Package unavailable'; end if;
  insert into public.study_applications(user_id,opportunity_id,proposal)
  values(p_user,o.id,jsonb_build_object(
    'name',o.name,'provider',o.provider,'destination',o.destination,'studyLevel',o.study_level,'field',o.field,
    'requirements',o.requirements,'deadline',o.deadline,'providerFee',o.provider_fee,'providerCurrency',o.provider_currency,
    'packageFee',o.package_fee_tzs,'supportSummary',o.support_summary,
    'image',case when o.private_image_id is null then o.image else '/api/scholarship-images/'||o.private_image_id::text end
  )) returning id into result;
  insert into public.study_application_history(application_id,actor_id,status,provider_decision,note)
  values(result,auth.uid(),'Starting','Not received','Scholarship package shared for applicant review.');
  perform private.notify_case_owner(p_user,'opportunity_proposed',result);
  return result;
end $$;

create function public.can_read_scholarship_image(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select (private.has_role(array['admin']::public.staff_role[]) and exists (
    select 1 from private.opportunities where private_image_id=p_id
  )) or exists (
    select 1 from public.study_applications a
    where a.proposal->>'image'='/api/scholarship-images/'||p_id::text
      and private.can_access_case(a.user_id)
  );
$$;

revoke all on function public.save_scholarship_package(uuid,jsonb,uuid),public.can_read_scholarship_image(uuid)
  from public,anon,authenticated;
grant execute on function public.save_scholarship_package(uuid,jsonb,uuid),public.can_read_scholarship_image(uuid)
  to authenticated;
-- Outstanding and accepted historical quotes are retained, with no new credit-based orders.
revoke execute on function public.accept_service_package(uuid,timestamptz),
  public.save_service_package(uuid,text,text,integer,boolean,boolean),public.save_opportunity(uuid,jsonb)
  from authenticated;
