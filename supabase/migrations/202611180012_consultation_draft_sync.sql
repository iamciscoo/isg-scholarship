-- Save consultation progress and the reused personal details in one transaction.
create function public.save_my_consultation_draft(p_data jsonb,p_step integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.active_user() then raise exception 'Access denied'; end if;
 insert into public.consultation_drafts(user_id,data,step,updated_at) values(auth.uid(),p_data,p_step,now())
 on conflict(user_id) do update set data=excluded.data,step=excluded.step,updated_at=excluded.updated_at;
 if length(trim(p_data->>'firstName'))>0 and length(trim(p_data->>'lastName'))>0 then
  update public.profiles set first_name=trim(p_data->>'firstName'),last_name=trim(p_data->>'lastName'),
   phone=coalesce(p_data->>'phone',phone),nationality=coalesce(p_data->>'nationality',nationality),residence=coalesce(p_data->>'residence',residence)
  where id=auth.uid();
 end if;
end $$;
revoke all on function public.save_my_consultation_draft(jsonb,integer) from public,anon;
grant execute on function public.save_my_consultation_draft(jsonb,integer) to authenticated;
