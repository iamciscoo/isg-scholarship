-- A successful retry must not overwrite profile edits or a later consultation draft.
create or replace function public.submit_my_consultation(p_data jsonb,p_key uuid,p_hash text,p_user uuid,p_team_email text default '') returns text
language plpgsql security definer set search_path='' as $$
declare result text; record public.eligibility_assessments; account_email text;
begin
 select u.email into account_email from auth.users u join public.profiles p on p.id=u.id where u.id=p_user and p.status='active';
 if account_email is null or lower(p_data->>'email')<>lower(account_email) then raise exception 'Account unavailable'; end if;
 -- submit_assessment holds the transaction's retry-key lock and validates the owner-prefixed hash.
 result:=public.submit_assessment(p_data,p_key,p_user::text||':'||p_hash,p_team_email);
 select * into record from public.eligibility_assessments where idempotency_key=p_key for update;
 if record.applicant_id is not null and record.applicant_id<>p_user then raise exception 'Access denied'; end if;
 if record.applicant_id=p_user then return result; end if;
 update public.eligibility_assessments set applicant_id=p_user where id=record.id;
 update public.profiles set first_name=record.first_name,last_name=record.last_name,phone=record.phone,nationality=record.nationality,residence=record.residence where id=p_user;
 delete from public.consultation_drafts where user_id=p_user;
 return result;
end $$;
