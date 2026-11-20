-- Admins are the advisors: nothing may still require the retired advisor role.
create or replace function public.assign_consultation_advisor(p_user uuid, p_advisor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.consultation_cases; assigned uuid;
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  select * into c from public.consultation_cases where user_id=p_user for update;
  if not found or c.payment_status<>'verified' then raise exception 'Verify consultation payment first'; end if;
  if not exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id
    where r.user_id=p_advisor and r.role='admin' and p.status='active')
  then raise exception 'Advisor is not active'; end if;
  select advisor_id into assigned from public.leads where id=c.lead_id for update;
  if assigned=p_advisor then return; end if;
  update public.leads set advisor_id=p_advisor,stage=case when stage='new' then 'under_review'::public.lead_stage else stage end
  where id=c.lead_id;
  insert into public.audit_logs(actor_id,action,entity_id,metadata)
  values(auth.uid(),'advisor.assigned',c.lead_id,jsonb_build_object('advisor_id',p_advisor));
  perform private.notify_case_owner(p_user,'advisor_assigned',gen_random_uuid());
end $$;

create or replace function private.case_has_advisor(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.consultation_cases c
    join public.leads l on l.id=c.lead_id
    join public.profiles p on p.id=l.advisor_id and p.status='active'
    join public.user_roles r on r.user_id=p.id and r.role='admin'
    where c.user_id=p_user and c.payment_status='verified'
  );
$$;