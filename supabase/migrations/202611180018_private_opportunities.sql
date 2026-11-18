create table private.opportunities(
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 200),provider text not null check(length(provider) between 1 and 200),
 destination text not null check(length(destination) between 1 and 100),study_level text not null check(length(study_level) between 1 and 80),field text not null check(length(field) between 1 and 160),
 requirements text not null check(length(requirements)<=10000),research_notes text not null default '' check(length(research_notes)<=5000),deadline date,source_url text not null check(source_url ~ '^https://'),
 provider_fee numeric(12,2) check(provider_fee>=0),provider_currency text not null default 'TZS' check(provider_currency in('TZS','USD','EUR','GBP','RUB')),
 image text not null default '/images/study-1.jpg' check(image ~ '^/images/[a-zA-Z0-9_-]+\.(jpg|png|webp)$'),
 active boolean not null default true,updated_at timestamptz not null default now()
);
create table public.service_packages(
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 160),description text not null check(length(description)<=3000),
 price_tzs integer not null check(price_tzs>=50000 and price_tzs<=100000000),active boolean not null default true,promoted boolean not null default false,updated_at timestamptz not null default now()
);
create table public.study_promotions(
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 160),destination text not null check(length(destination) between 1 and 100),
 study_level text not null check(length(study_level) between 1 and 80),field text not null check(length(field) between 1 and 160),funding_type text not null check(length(funding_type)<=200),
 eligibility text not null check(length(eligibility)<=2000),image text not null check(image ~ '^/images/[a-zA-Z0-9_-]+\.(jpg|png|webp)$'),published boolean not null default false,updated_at timestamptz not null default now()
);
alter table private.opportunities enable row level security;
alter table public.service_packages enable row level security;
alter table public.study_promotions enable row level security;
revoke all on private.opportunities,public.service_packages,public.study_promotions from public,anon,authenticated;
grant select on public.service_packages,public.study_promotions to anon,authenticated;
-- Anonymous policies never need access to private authorization functions.
create policy packages_public on public.service_packages for select to anon using(active and promoted);
create policy packages_account on public.service_packages for select to authenticated using((active and promoted) or private.has_role(array['admin']::public.staff_role[]));
create policy promotions_public on public.study_promotions for select to anon using(published);
create policy promotions_account on public.study_promotions for select to authenticated using(published or private.has_role(array['admin']::public.staff_role[]));
create function public.admin_opportunities() returns setof private.opportunities language plpgsql stable security definer set search_path='' as $$
begin if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied';end if;return query select * from private.opportunities order by updated_at desc;end $$;
create function public.staff_opportunity_choices() returns table(id uuid,name text,provider text,destination text,study_level text) language plpgsql stable security definer set search_path='' as $$
begin if not private.has_role(array['admin','advisor']::public.staff_role[]) then raise exception 'Access denied';end if;return query select o.id,o.name,o.provider,o.destination,o.study_level from private.opportunities o where o.active and (o.deadline is null or o.deadline>=current_date) order by o.name;end $$;
create function public.save_opportunity(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied';end if;
 insert into private.opportunities(id,name,provider,destination,study_level,field,requirements,research_notes,deadline,source_url,provider_fee,provider_currency,image,active)
 values(coalesce(p_id,gen_random_uuid()),p_data->>'name',p_data->>'provider',p_data->>'destination',p_data->>'studyLevel',p_data->>'field',p_data->>'requirements',coalesce(p_data->>'staffNotes',''),nullif(p_data->>'deadline','')::date,p_data->>'sourceUrl',nullif(p_data->>'providerFee','')::numeric,p_data->>'providerCurrency',p_data->>'image',(p_data->>'active')::boolean)
 on conflict(id) do update set name=excluded.name,provider=excluded.provider,destination=excluded.destination,study_level=excluded.study_level,field=excluded.field,requirements=excluded.requirements,research_notes=excluded.research_notes,deadline=excluded.deadline,source_url=excluded.source_url,provider_fee=excluded.provider_fee,provider_currency=excluded.provider_currency,image=excluded.image,active=excluded.active,updated_at=now() returning id into result;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'opportunity.saved',result);return result;
end $$;
create function public.save_service_package(p_id uuid,p_name text,p_description text,p_price integer,p_active boolean,p_promoted boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied';end if;
 insert into public.service_packages(id,name,description,price_tzs,active,promoted) values(coalesce(p_id,gen_random_uuid()),p_name,p_description,p_price,p_active,p_promoted)
 on conflict(id) do update set name=excluded.name,description=excluded.description,price_tzs=excluded.price_tzs,active=excluded.active,promoted=excluded.promoted,updated_at=now() returning id into result;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'package.saved',result);return result;
end $$;
create function public.save_study_promotion(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied';end if;
 insert into public.study_promotions(id,title,destination,study_level,field,funding_type,eligibility,image,published) values(coalesce(p_id,gen_random_uuid()),p_data->>'title',p_data->>'destination',p_data->>'studyLevel',p_data->>'field',p_data->>'fundingType',p_data->>'eligibility',p_data->>'image',(p_data->>'published')::boolean)
 on conflict(id) do update set title=excluded.title,destination=excluded.destination,study_level=excluded.study_level,field=excluded.field,funding_type=excluded.funding_type,eligibility=excluded.eligibility,image=excluded.image,published=excluded.published,updated_at=now() returning id into result;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'promotion.saved',result);return result;
end $$;
revoke all on function public.admin_opportunities(),public.staff_opportunity_choices(),public.save_opportunity(uuid,jsonb),public.save_service_package(uuid,text,text,integer,boolean,boolean),public.save_study_promotion(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_opportunities(),public.staff_opportunity_choices(),public.save_opportunity(uuid,jsonb),public.save_service_package(uuid,text,text,integer,boolean,boolean),public.save_study_promotion(uuid,jsonb) to authenticated;
