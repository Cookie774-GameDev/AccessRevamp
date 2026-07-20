create or replace function public.scan_accessrevamp_payment_anomalies()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_touched integer := 0;
  v_count integer;
begin
  insert into public.payment_security_incidents (dedupe_key, incident_type, severity, stripe_object_id, details)
  select 'unprocessed-stripe-event:' || events.id, 'unfulfilled_paid_checkout', 'critical', events.id,
    jsonb_build_object('event_type', events.event_type, 'received_at', events.received_at)
  from public.stripe_events events
  where events.event_type in ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
    and events.processed_at is null and events.received_at < timezone('utc', now()) - interval '5 minutes'
  on conflict (dedupe_key) do update set last_seen_at = timezone('utc', now()), details = excluded.details,
    status = case when public.payment_security_incidents.status = 'resolved' then 'open' else public.payment_security_incidents.status end;
  get diagnostics v_count = row_count; v_touched := v_touched + v_count;

  insert into public.payment_security_incidents (dedupe_key, incident_type, severity, order_id, stripe_object_id, details)
  select 'paid-order-incomplete:' || orders.id::text, 'unfulfilled_paid_checkout', 'critical', orders.id,
    orders.stripe_checkout_session_id,
    jsonb_build_object(
      'missing_project', not exists (select 1 from public.customer_projects p where p.order_id = orders.id),
      'missing_entitlement', not exists (select 1 from public.entitlements e where e.source_order_id = orders.id),
      'created_at', orders.created_at)
  from public.orders orders
  where orders.status = 'paid' and orders.created_at < timezone('utc', now()) - interval '5 minutes'
    and (not exists (select 1 from public.customer_projects p where p.order_id = orders.id)
      or not exists (select 1 from public.entitlements e where e.source_order_id = orders.id))
  on conflict (dedupe_key) do update set last_seen_at = timezone('utc', now()), details = excluded.details,
    status = case when public.payment_security_incidents.status = 'resolved' then 'open' else public.payment_security_incidents.status end;
  get diagnostics v_count = row_count; v_touched := v_touched + v_count;

  insert into public.payment_security_incidents (dedupe_key, incident_type, severity, stripe_object_id, details)
  select 'stale-checkout-reservation:' || reservations.id::text, 'configuration_failure', 'warning', reservations.checkout_session_id,
    jsonb_build_object('reservation_id', reservations.id, 'user_id', reservations.user_id, 'status', reservations.status, 'expires_at', reservations.expires_at)
  from public.upgrade_reservations reservations
  where reservations.status = 'checkout_created'
    and reservations.expires_at < timezone('utc', now()) - interval '10 minutes'
    and not exists (select 1 from public.orders o where o.reservation_id = reservations.id)
  on conflict (dedupe_key) do update set last_seen_at = timezone('utc', now()), details = excluded.details;
  get diagnostics v_count = row_count; v_touched := v_touched + v_count;

  insert into public.payment_security_incidents (dedupe_key, incident_type, severity, stripe_object_id, details)
  select 'stale-order-draft:' || drafts.id::text, 'configuration_failure', 'warning', drafts.checkout_session_id,
    jsonb_build_object('draft_id', drafts.id, 'status', drafts.status, 'updated_at', drafts.updated_at)
  from public.order_drafts drafts
  where drafts.status = 'checkout_created' and drafts.updated_at < timezone('utc', now()) - interval '45 minutes' and drafts.order_id is null
  on conflict (dedupe_key) do update set last_seen_at = timezone('utc', now()), details = excluded.details;
  get diagnostics v_count = row_count; v_touched := v_touched + v_count;

  if exists (
    select 1 from public.tier_catalog tiers
    join public.stripe_price_catalog prices on prices.transition_key = 'none->' || tiers.tier_key
    where tiers.tier_key in ('homepage_reveal','complete_revamp','cinematic_scroll')
      and (tiers.stripe_full_price_id is distinct from prices.stripe_price_id
        or tiers.list_price_cents is distinct from prices.net_cents or prices.active is not true)
  ) then
    insert into public.payment_security_incidents (dedupe_key, incident_type, severity, details)
    values ('canonical-stripe-catalog-mismatch', 'catalog_mismatch', 'critical', jsonb_build_object('detected_at', timezone('utc', now())))
    on conflict (dedupe_key) do update set last_seen_at = timezone('utc', now()), status = 'open', details = excluded.details;
    update public.payment_runtime_settings set checkout_enabled = false,
      maintenance_reason = 'Checkout paused automatically because the canonical Stripe catalog did not match.',
      updated_at = timezone('utc', now()) where singleton = true;
    v_touched := v_touched + 1;
  end if;
  return v_touched;
end;
$$;
revoke all on function public.scan_accessrevamp_payment_anomalies() from public, anon, authenticated;
grant execute on function public.scan_accessrevamp_payment_anomalies() to service_role;

select cron.schedule('accessrevamp-payment-anomaly-scan', '*/5 * * * *', 'select public.scan_accessrevamp_payment_anomalies();')
where not exists (select 1 from cron.job where jobname = 'accessrevamp-payment-anomaly-scan');
