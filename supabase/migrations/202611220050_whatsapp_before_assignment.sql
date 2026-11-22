-- Approved consultations can request a WhatsApp call before an advisor is assigned.
create or replace function private.guard_consultation_support() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='meeting_requests' then
   if new.channel='whatsapp' and exists (
     select 1 from public.consultation_cases where user_id=new.user_id and payment_status='verified'
   ) then return new; end if;
 end if;
 if not private.case_has_advisor(new.user_id) then raise exception 'Advisor assignment required'; end if;
 return new;
end $$;
