create table public.study_applications(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.consultation_cases on delete cascade,
 opportunity_id uuid not null references private.opportunities,
 proposal jsonb not null,proposal_version integer not null default 1,
 approval text not null default 'pending' check(approval in('pending','approved','declined')),
 approved_at timestamptz,declaration_id uuid references public.application_declarations,
 status text not null default 'Starting' check(status in('Starting','Applying','Waiting for decision','Accepted','Rejected','Cancelled','Completed')),
 provider_decision text not null default 'Not received' check(provider_decision in('Not received','Pending','Accepted','Rejected','Withdrawn')),
 provider_decision_date date,provider_evidence text not null default '' check(length(provider_evidence)<=2000),
 next_step text not null default '' check(length(next_step)<=1000),next_date date,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.study_application_history(
 id uuid primary key default gen_random_uuid(),application_id uuid not null references public.study_applications on delete cascade,
 actor_id uuid not null references public.profiles,status text not null,provider_decision text not null,note text not null check(length(note) between 1 and 2000),created_at timestamptz not null default now()
);
create table public.service_orders(
 id uuid primary key default gen_random_uuid(),user_id uuid not null unique references public.consultation_cases on delete cascade,package_id uuid not null references public.service_packages,
 package_name text not null,package_description text not null,gross_tzs integer not null check(gross_tzs>=50000),consultation_credit_tzs integer not null check(consultation_credit_tzs=50000),
 remaining_tzs integer generated always as(gross_tzs-consultation_credit_tzs) stored,accepted_at timestamptz not null default now()
);
alter table public.study_applications enable row level security;
alter table public.study_application_history enable row level security;
alter table public.service_orders enable row level security;
revoke all on public.study_applications,public.study_application_history,public.service_orders from public,anon,authenticated;
grant select on public.study_applications,public.study_application_history,public.service_orders to authenticated;
create policy applications_read on public.study_applications for select to authenticated using(private.can_access_case(user_id));
create policy application_history_read on public.study_application_history for select to authenticated using(exists(select 1 from public.study_applications a where a.id=application_id and private.can_access_case(a.user_id)));
create policy orders_read on public.service_orders for select to authenticated using(private.can_access_case(user_id));
create function public.propose_application(p_user uuid,p_opportunity uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare o private.opportunities;result uuid;
begin
 if not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(p_user) then raise exception 'Access denied';end if;
 if not exists(select 1 from public.consultation_cases where user_id=p_user and payment_status='verified' and completed_at is not null) then raise exception 'Consultation required';end if;
 select * into o from private.opportunities where id=p_opportunity and active;
 if not found or (o.deadline is not null and o.deadline<current_date) then raise exception 'Opportunity unavailable';end if;
 insert into public.study_applications(user_id,opportunity_id,proposal) values(p_user,o.id,jsonb_build_object('name',o.name,'provider',o.provider,'destination',o.destination,'studyLevel',o.study_level,'field',o.field,'requirements',o.requirements,'deadline',o.deadline,'sourceUrl',o.source_url,'providerFee',o.provider_fee,'providerCurrency',o.provider_currency)) returning id into result;
 insert into public.study_application_history(application_id,actor_id,status,provider_decision,note) values(result,auth.uid(),'Starting','Not received','Opportunity proposed. Applicant approval is required before submission.');
 perform private.notify_case_owner(p_user,'opportunity_proposed',result);return result;
end $$;
create function public.approve_application(p_application uuid,p_approve boolean) returns void language plpgsql security definer set search_path='' as $$
declare a public.study_applications;declaration uuid;
begin
 select * into a from public.study_applications where id=p_application for update;
 if not found or not private.active_user() or a.user_id<>auth.uid() then raise exception 'Access denied';end if;
 if a.approval<>'pending' or a.status<>'Starting' then raise exception 'Already reviewed';end if;
 select current_declaration_id into declaration from public.consultation_cases where user_id=auth.uid();
 if p_approve and declaration is null then raise exception 'Submit application declaration first';end if;
 update public.study_applications set approval=case when p_approve then 'approved' else 'declined' end,approved_at=now(),declaration_id=case when p_approve then declaration end,status=case when p_approve then 'Starting' else 'Cancelled' end,updated_at=now() where id=p_application;
 insert into public.study_application_history(application_id,actor_id,status,provider_decision,note) values(a.id,auth.uid(),case when p_approve then 'Starting' else 'Cancelled' end,a.provider_decision,case when p_approve then 'Applicant approved the disclosed provider, requirements and fee information.' else 'Applicant declined this proposal.' end);
 perform private.queue_admin_event('application.updated',a.id);
end $$;
create function public.update_study_application(p_application uuid,p_status text,p_decision text,p_decision_date date,p_evidence text,p_note text,p_next text,p_next_date date) returns void language plpgsql security definer set search_path='' as $$
declare a public.study_applications;allowed text[];
begin
 select * into a from public.study_applications where id=p_application for update;
 if not found or not private.has_role(array['admin','advisor']::public.staff_role[]) or not private.can_access_case(a.user_id) then raise exception 'Access denied';end if;
 allowed:=case a.status when 'Starting' then array['Starting','Applying','Cancelled'] when 'Applying' then array['Applying','Waiting for decision','Accepted','Rejected','Cancelled'] when 'Waiting for decision' then array['Waiting for decision','Accepted','Rejected','Cancelled'] when 'Accepted' then array['Accepted','Cancelled'] else array[a.status] end;
 if not p_status=any(allowed) then raise exception 'Invalid workflow transition';end if;
 if p_status in('Applying','Waiting for decision','Accepted','Rejected') and a.approval<>'approved' then raise exception 'Applicant approval required';end if;
 if p_status='Applying' and exists(select 1 from public.document_requests r where r.user_id=a.user_id and r.required and not exists(select 1 from public.case_files f where f.user_id=a.user_id and f.kind='document' and f.category=r.category and f.review_status='approved')) then raise exception 'Required documents need approval';end if;
 if p_decision in('Accepted','Rejected','Withdrawn') and (p_decision_date is null or p_decision_date>current_date or length(trim(p_evidence))<3) then raise exception 'Record official decision date and evidence';end if;
 if(p_status='Accepted' and p_decision<>'Accepted') or(p_status='Rejected' and p_decision<>'Rejected') then raise exception 'Official decision required';end if;
 if length(trim(p_note))<3 or length(p_note)>2000 then raise exception 'History note required';end if;
 update public.study_applications set status=p_status,provider_decision=p_decision,provider_decision_date=p_decision_date,provider_evidence=p_evidence,next_step=p_next,next_date=p_next_date,updated_at=now() where id=a.id;
 insert into public.study_application_history(application_id,actor_id,status,provider_decision,note) values(a.id,auth.uid(),p_status,p_decision,trim(p_note));
 perform private.notify_case_owner(a.user_id,'application_update',gen_random_uuid());perform private.queue_admin_event('application.updated',gen_random_uuid());
end $$;
create function public.commit_study_place(p_application uuid,p_close_others boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare a public.study_applications;other public.study_applications;
begin
 select * into a from public.study_applications where id=p_application;
 if not found or not private.active_user() or a.user_id<>auth.uid() then raise exception 'Access denied';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,19));
 select * into a from public.study_applications where id=p_application for update;
 if a.status<>'Accepted' or a.provider_decision<>'Accepted' then raise exception 'Accepted place required';end if;
 update public.study_applications set status='Completed',updated_at=now() where id=a.id;
 insert into public.study_application_history(application_id,actor_id,status,provider_decision,note) values(a.id,auth.uid(),'Completed',a.provider_decision,'Applicant confirmed commitment to this place.');
 if p_close_others then
  for other in select * from public.study_applications where user_id=auth.uid() and id<>a.id and status in('Starting','Applying','Waiting for decision','Accepted') for update loop
   update public.study_applications set status='Cancelled',next_step='Applicant chose another place; advisor to confirm any necessary provider withdrawal.',updated_at=now() where id=other.id;
   insert into public.study_application_history(application_id,actor_id,status,provider_decision,note) values(other.id,auth.uid(),'Cancelled',other.provider_decision,'Applicant requested closure after committing to another place. This is an ISG workflow closure, not an automatic provider withdrawal.');
  end loop;
 end if;perform private.queue_admin_event('application.updated',gen_random_uuid());
end $$;
create function public.accept_service_package(p_package uuid,p_quote_updated_at timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.consultation_cases;p public.service_packages;result uuid;
begin
 if not private.active_user() then raise exception 'Access denied';end if;
 select * into c from public.consultation_cases where user_id=auth.uid() for update;
 if not found or c.payment_status<>'verified' then raise exception 'Payment verification required';end if;
 select * into p from public.service_packages where id=p_package and active and promoted for update;
 if not found then raise exception 'Package unavailable';end if;
 if p.updated_at is distinct from p_quote_updated_at then raise exception 'Package quote changed; review the current price and scope';end if;
 select id into result from public.service_orders where user_id=auth.uid();
 if found then raise exception 'Consultation credit already allocated';end if;
 insert into public.service_orders(user_id,package_id,package_name,package_description,gross_tzs,consultation_credit_tzs) values(auth.uid(),p.id,p.name,p.description,p.price_tzs,50000) returning id into result;
 perform private.notify_case_owner(auth.uid(),'package_accepted',result);perform private.queue_admin_event('package.accepted',result);insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'package.quote_accepted',result);return result;
end $$;
revoke all on function public.propose_application(uuid,uuid),public.approve_application(uuid,boolean),public.update_study_application(uuid,text,text,date,text,text,text,date),public.commit_study_place(uuid,boolean),public.accept_service_package(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.propose_application(uuid,uuid),public.approve_application(uuid,boolean),public.update_study_application(uuid,text,text,date,text,text,text,date),public.commit_study_place(uuid,boolean),public.accept_service_package(uuid,timestamptz) to authenticated;
