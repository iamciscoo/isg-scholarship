-- A crashed worker on the final attempt must surface as failed, rather than remain processing.
create or replace function public.claim_notifications(p_limit integer default 10) returns setof private.notification_outbox
language plpgsql security definer set search_path = '' as $$
begin
  update private.notification_outbox set state='failed',lease_until=null,last_error='worker_lease_exhausted'
    where attempts>=5 and state='processing' and lease_until<now();
  return query update private.notification_outbox n set state='processing',attempts=attempts+1,
    lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
  where n.id in (select q.id from private.notification_outbox q where
    ((q.state='pending' and q.available_at<=now()) or (q.state='processing' and q.lease_until<now())) and q.attempts<5
    order by q.created_at for update skip locked limit least(greatest(p_limit,1),25)) returning n.*;
end $$;
revoke all on function public.claim_notifications(integer) from public,anon,authenticated;
grant execute on function public.claim_notifications(integer) to service_role;
