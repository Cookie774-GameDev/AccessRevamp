create or replace function public.enforce_accessrevamp_webhook_liveness()
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_stale_count integer;
begin
  select count(*) into v_stale_count
    from public.upgrade_reservations reservations
   where reservations.status = 'checkout_created'
     and reservations.expires_at < timezone('utc', now()) - interval '60 minutes'
     and not exists (
       select 1 from public.orders orders where orders.reservation_id = reservations.id
     );

  if v_stale_count = 0 then return false; end if;

  insert into public.payment_security_incidents (
    dedupe_key, incident_type, severity, details
  ) values (
    'stripe-webhook-liveness-failed',
    'webhook_failure',
    'critical',
    jsonb_build_object(
      'stale_checkout_count', v_stale_count,
      'detected_at', timezone('utc', now()),
      'action', 'checkout_paused'
    )
  ) on conflict (dedupe_key) do update set
    last_seen_at = timezone('utc', now()),
    details = excluded.details,
    status = case
      when public.payment_security_incidents.status = 'resolved' then 'open'
      else public.payment_security_incidents.status
    end;

  update public.payment_runtime_settings
     set checkout_enabled = false,
         maintenance_reason = 'Checkout paused automatically because an expired Stripe Session was not reconciled by the webhook.',
         updated_at = timezone('utc', now())
   where singleton = true and checkout_enabled = true;

  insert into public.accessrevamp_audit_log (action, entity_type, entity_id, details)
  values (
    'checkout_paused_for_webhook_liveness',
    'payment_runtime',
    'singleton',
    jsonb_build_object('stale_checkout_count', v_stale_count)
  );
  return true;
end;
$$;
revoke all on function public.enforce_accessrevamp_webhook_liveness() from public, anon, authenticated;
grant execute on function public.enforce_accessrevamp_webhook_liveness() to service_role;

select cron.schedule(
  'accessrevamp-webhook-liveness',
  '*/5 * * * *',
  'select public.enforce_accessrevamp_webhook_liveness();'
)
where not exists (
  select 1 from cron.job where jobname = 'accessrevamp-webhook-liveness'
);
