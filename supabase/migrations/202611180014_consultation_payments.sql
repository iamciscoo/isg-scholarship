-- One paid consultation entitlement per account. No bank/payment integration is implied.
create table public.consultation_cases (
 user_id uuid primary key references public.profiles on delete cascade,
 lead_id uuid not null references public.leads,
 fee_tzs integer not null default 50000 check(fee_tzs=50000),
 payment_status text not null default 'awaiting_receipt' check(payment_status in('awaiting_receipt','pending_verification','verified','rejected')),
 verified_at timestamptz,verified_by uuid references public.profiles,
 completed_at timestamptz,created_at timestamptz not null default now(),
 check((payment_status='verified')=(verified_at is not null))
);
create table private.payment_instructions (
 id boolean primary key default true check(id),instructions text not null default '' check(length(instructions)<=5000),updated_at timestamptz not null default now()
);
insert into private.payment_instructions(id) values(true);
create table public.case_files (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.consultation_cases on delete cascade,
 kind text not null check(kind in('receipt','document')),category text not null check(length(category) between 1 and 80),
 storage_path text not null unique,mime text not null check(mime in('image/webp','application/pdf')),
 bytes integer not null check(bytes between 1 and 8388608),sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 review_status text not null default 'pending' check(review_status in('pending','approved','rejected')),
 review_note text not null default '' check(length(review_note)<=1000),reviewed_by uuid references public.profiles,reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index case_files_owner on public.case_files(user_id,created_at desc);
create function private.can_access_case(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.active_user() and (auth.uid()=p_user or exists(select 1 from public.consultation_cases c where c.user_id=p_user and private.can_review(c.lead_id)));
$$;
create function private.open_consultation_case() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.applicant_id is not null then
  insert into public.consultation_cases(user_id,lead_id) select new.applicant_id,l.id from public.leads l where l.assessment_id=new.id on conflict(user_id) do nothing;
 end if;return new;
end $$;
create trigger consultation_case_opened after update of applicant_id on public.eligibility_assessments for each row execute function private.open_consultation_case();
insert into public.consultation_cases(user_id,lead_id) select distinct on(a.applicant_id) a.applicant_id,l.id from public.eligibility_assessments a join public.leads l on l.assessment_id=a.id where a.applicant_id is not null order by a.applicant_id,a.created_at on conflict do nothing;
alter table public.consultation_cases enable row level security;
alter table public.case_files enable row level security;
alter table private.payment_instructions enable row level security;
revoke all on public.consultation_cases,public.case_files,private.payment_instructions from public,anon,authenticated;
grant select on public.consultation_cases,public.case_files to authenticated;
create policy consultation_case_read on public.consultation_cases for select to authenticated using(private.can_access_case(user_id));
create policy case_file_read on public.case_files for select to authenticated using(private.active_user() and (user_id=auth.uid() or (kind='receipt' and private.has_role(array['admin']::public.staff_role[])) or (kind='document' and private.can_access_case(user_id))));
grant execute on function private.can_access_case(uuid) to authenticated;
revoke all on function private.open_consultation_case() from public,anon,authenticated;
create function public.consultation_payment_instructions() returns text language plpgsql stable security definer set search_path='' as $$
begin if not private.active_user() then raise exception 'Access denied';end if;return(select instructions from private.payment_instructions where id);end $$;
create function public.save_payment_instructions(p_instructions text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied';end if;
 if p_instructions is null or length(trim(p_instructions))<10 or length(p_instructions)>5000 then raise exception 'Enter payment instructions';end if;
 update private.payment_instructions set instructions=trim(p_instructions),updated_at=now() where id;
 insert into public.audit_logs(actor_id,action) values(auth.uid(),'payment.instructions_changed');
end $$;
create function public.register_case_file(p_user uuid,p_id uuid,p_kind text,p_category text,p_path text,p_mime text,p_bytes integer,p_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.consultation_cases;
begin
 select * into c from public.consultation_cases where user_id=p_user for update;
 if not found or not exists(select 1 from public.profiles where id=p_user and status='active') then raise exception 'Access denied';end if;
 if p_path<>(p_user::text||'/'||p_id::text||case when p_mime='image/webp' then '.webp' else '.pdf' end) then raise exception 'Invalid path';end if;
 if not exists(select 1 from storage.objects where bucket_id='case-files' and name=p_path) then raise exception 'File unavailable';end if;
 if p_kind='receipt' and c.payment_status in('verified','pending_verification') then raise exception 'Payment already submitted';end if;
 if p_kind='document' and c.completed_at is null then raise exception 'Application locked';end if;
 insert into public.case_files(id,user_id,kind,category,storage_path,mime,bytes,sha256) values(p_id,p_user,p_kind,p_category,p_path,p_mime,p_bytes,p_hash);
 if p_kind='receipt' then
  update public.consultation_cases set payment_status='pending_verification' where user_id=p_user;
  perform private.queue_admin_event('payment.receipt_received',p_id);
 end if;
 insert into public.audit_logs(actor_id,action,entity_id,metadata) values(p_user,'case.file_uploaded',p_id,jsonb_build_object('kind',p_kind));return p_id;
end $$;
create function public.review_consultation_payment(p_file uuid,p_approve boolean,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare f public.case_files;c public.consultation_cases;
begin
 if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied';end if;
 select * into f from public.case_files where id=p_file and kind='receipt';
 if not found then raise exception 'Receipt unavailable';end if;
 select * into c from public.consultation_cases where user_id=f.user_id for update;
 select * into f from public.case_files where id=p_file for update;
 if f.review_status<>'pending' or c.payment_status='verified' then raise exception 'Already reviewed';end if;
 if p_note is null or length(trim(p_note))<3 or length(p_note)>1000 then raise exception 'Review note required';end if;
 update public.case_files set review_status=case when p_approve then 'approved' else 'rejected' end,review_note=trim(p_note),reviewed_by=auth.uid(),reviewed_at=now() where id=p_file;
 update public.consultation_cases set payment_status=case when p_approve then 'verified' else 'rejected' end,verified_at=case when p_approve then now() end,verified_by=case when p_approve then auth.uid() end where user_id=f.user_id;
 insert into public.audit_logs(actor_id,action,entity_id,metadata) values(auth.uid(),'payment.reviewed',p_file,jsonb_build_object('approved',p_approve));
 perform private.queue_admin_event('payment.reviewed',p_file);
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('case-files','case-files',false,8388608,array['image/webp','application/pdf']) on conflict(id) do nothing;
-- No browser upload/download policy: the authenticated server validates content and authorization.
revoke all on function public.consultation_payment_instructions(),public.save_payment_instructions(text),public.review_consultation_payment(uuid,boolean,text),public.register_case_file(uuid,uuid,text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.consultation_payment_instructions(),public.save_payment_instructions(text),public.review_consultation_payment(uuid,boolean,text) to authenticated;
grant execute on function public.register_case_file(uuid,uuid,text,text,text,text,integer,text) to service_role;
