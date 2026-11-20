-- Admins can delete contact enquiries, and one account gets one consultation.
create or replace function public.delete_contact_enquiry(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  delete from public.contact_enquiries where id = p_id;
  if not found then raise exception 'Enquiry not found'; end if;
  insert into public.audit_logs(actor_id, action, entity_id) values (auth.uid(), 'enquiry.deleted', p_id);
end $$;
revoke all on function public.delete_contact_enquiry(uuid) from public, anon;
grant execute on function public.delete_contact_enquiry(uuid) to authenticated;

-- A second submission from the same account fails instead of opening another lead.
create unique index assessments_one_per_applicant on public.eligibility_assessments(applicant_id)
  where applicant_id is not null;
