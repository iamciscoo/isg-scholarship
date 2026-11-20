-- Admins can remove saved packages and public promotions, and enquiries can carry a WhatsApp number.
alter table public.contact_enquiries add column whatsapp text check (whatsapp is null or length(whatsapp) between 7 and 20);

create or replace function public.submit_enquiry(p_data jsonb,p_key uuid,p_hash text,p_team_email text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare record_id uuid; existing_hash text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select id,payload_hash into record_id,existing_hash from public.contact_enquiries where idempotency_key=p_key;
  if found then
    if existing_hash<>p_hash then raise exception 'Idempotency mismatch'; end if;
    return record_id;
  end if;
  insert into public.contact_enquiries(name,email,topic,message,whatsapp,idempotency_key,payload_hash)
    values(p_data->>'name',p_data->>'email',p_data->>'topic',p_data->>'message',nullif(p_data->>'whatsapp',''),p_key,p_hash)
    returning id into record_id;
  if p_team_email<>'' then
    insert into private.notification_outbox(event,recipient,payload,dedupe_key)
      values('team_enquiry',p_team_email,jsonb_build_object('reference',record_id::text),record_id||':team_enquiry');
  end if;
  return record_id;
end $$;

-- Returns the private image id so the caller can remove the stored file.
create function public.delete_scholarship_package(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare image_id uuid;
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  delete from private.opportunities where id=p_id returning private_image_id into image_id;
  if not found then raise exception 'Package not found'; end if;
  insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'scholarship_package.deleted',p_id);
  return image_id;
end $$;

create function public.delete_study_promotion(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(array['admin']::public.staff_role[]) then raise exception 'Access denied'; end if;
  delete from public.study_promotions where id=p_id;
  if not found then raise exception 'Promotion not found'; end if;
  insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'study_promotion.deleted',p_id);
end $$;

revoke all on function public.delete_scholarship_package(uuid),public.delete_study_promotion(uuid) from public,anon,authenticated;
grant execute on function public.delete_scholarship_package(uuid),public.delete_study_promotion(uuid) to authenticated;
