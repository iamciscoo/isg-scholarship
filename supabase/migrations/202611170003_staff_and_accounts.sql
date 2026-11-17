create function public.link_my_assessments() returns void language plpgsql security definer set search_path = '' as $$
declare verified_email text;
begin
  if not private.active_user() then raise exception 'Access denied'; end if;
  select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  update public.eligibility_assessments set applicant_id=auth.uid() where email=verified_email and applicant_id is null;
end $$;

create function public.accept_account_terms() returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.active_user() then raise exception 'Access denied'; end if;
  if not exists(select 1 from public.consent_records where user_id=auth.uid() and purpose='account_terms') then
    insert into public.consent_records(user_id,purpose,granted) values(auth.uid(),'account_terms',true);
  end if;
end $$;

create function public.review_lead(p_id uuid, p_stage public.lead_stage, p_reason text, p_advisor uuid, p_follow_up date) returns void
language plpgsql security definer set search_path = '' as $$
declare original public.leads;
begin
  select * into original from public.leads where id=p_id for update;
  if not found or not private.can_review(p_id) then raise exception 'Access denied'; end if;
  if length(trim(p_reason)) not between 5 and 1500 then raise exception 'Review reason required'; end if;
  if p_advisor is distinct from original.advisor_id and not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Only administrators assign advisors'; end if;
  if p_advisor is not null and not exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id where r.user_id=p_advisor and r.role='advisor' and p.status='active') then raise exception 'Advisor is not active'; end if;
  update public.leads set stage=p_stage, advisor_id=p_advisor, follow_up=p_follow_up where id=p_id;
  insert into private.lead_notes(lead_id,author_id,stage,reason) values(p_id,auth.uid(),p_stage,trim(p_reason));
  insert into public.audit_logs(actor_id,action,entity_id,metadata) values(auth.uid(),'lead.reviewed',p_id,
    jsonb_build_object('from',original.stage,'to',p_stage,'advisor_id',p_advisor));
end $$;

create function public.lead_notes(p_id uuid) returns table(id uuid, stage public.lead_stage, reason text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_review(p_id) then raise exception 'Access denied'; end if;
  return query select n.id,n.stage,n.reason,n.created_at from private.lead_notes n where n.lead_id=p_id order by n.created_at desc;
end $$;

create function public.notification_summary() returns table(state text, total bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  return query select n.state,count(*) from private.notification_outbox n group by n.state;
end $$;
revoke all on function public.link_my_assessments(), public.accept_account_terms(), public.review_lead(uuid,public.lead_stage,text,uuid,date), public.lead_notes(uuid), public.notification_summary() from public, anon;
grant execute on function public.link_my_assessments(), public.accept_account_terms(), public.review_lead(uuid,public.lead_stage,text,uuid,date), public.lead_notes(uuid), public.notification_summary() to authenticated;
