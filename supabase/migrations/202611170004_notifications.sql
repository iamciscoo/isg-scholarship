create function public.claim_notifications(p_limit integer default 10) returns setof private.notification_outbox
language plpgsql security definer set search_path = '' as $$
begin
  return query update private.notification_outbox n set state='processing',attempts=attempts+1,
    lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
  where n.id in (select q.id from private.notification_outbox q where
    ((q.state='pending' and q.available_at<=now()) or (q.state='processing' and q.lease_until<now())) and q.attempts<5
    order by q.created_at for update skip locked limit least(greatest(p_limit,1),25)) returning n.*;
end $$;
create function public.finish_notification(p_id uuid,p_lease uuid,p_provider_id text,p_error text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update private.notification_outbox set
    state=case when p_error is null then 'sent' when attempts>=5 then 'failed' else 'pending' end,
    provider_id=p_provider_id,last_error=p_error,
    sent_at=case when p_error is null then now() else null end,
    available_at=now()+make_interval(secs=>least(3600,60*power(2,attempts)::integer)),lease_until=null
    where id=p_id and lease_id=p_lease and state='processing';
end $$;
revoke all on function public.claim_notifications(integer),public.finish_notification(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.claim_notifications(integer),public.finish_notification(uuid,uuid,text,text) to service_role;
