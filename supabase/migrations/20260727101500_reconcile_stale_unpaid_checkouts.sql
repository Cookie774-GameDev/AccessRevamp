-- Stripe Checkout Sessions have a provider-side expiry. Once an unpaid local
-- reservation is more than 60 minutes past its matching expiry and no order
-- exists, it can no longer become a valid AccessRevamp payment. Reconcile that
-- stale local state without taking checkout offline for every customer.

create or replace function public.reconcile_accessrevamp_stale_unpaid_checkouts()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_reconciled integer := 0;
  v_reservation_ids uuid[];
begin
  select coalesce(array_agg(reservations.id), '{}'::uuid[])
    into v_reservation_ids
    from public.upgrade_reservations reservations
   where reservations.status = 'checkout_created'
     and reservations.expires_at < timezone('utc', now()) - interval '60 minutes'
     and not exists (
       select 1
         from public.orders orders
        where orders.reservation_id = reservations.id
     );

  if cardinality(v_reservation_ids) = 0 then
    return 0;
  end if;

  update public.upgrade_reservations
     set status = 'expired',
         updated_at = timezone('utc', now())
   where id = any(v_reservation_ids)
     and status = 'checkout_created';
  get diagnostics v_reconciled = row_count;

  update public.order_drafts
     set status = 'expired',
         updated_at = timezone('utc', now())
   where reservation_id = any(v_reservation_ids)
     and status = 'checkout_created'
     and order_id is null;

  update public.payment_security_incidents
     set status = 'resolved',
         resolved_at = coalesce(resolved_at, timezone('utc', now())),
         last_seen_at = timezone('utc', now()),
         details = details || jsonb_build_object(
           'resolution', 'stale_checkout_reconciled',
           'resolved_at', timezone('utc', now())
         )
   where status = 'open'
     and (
       dedupe_key = 'stripe-webhook-liveness-failed'
       or dedupe_key = any(
         select 'stale-checkout-reservation:' || id::text
           from unnest(v_reservation_ids) as stale(id)
       )
       or dedupe_key = any(
         select 'stale-order-draft:' || drafts.id::text
           from public.order_drafts drafts
          where drafts.reservation_id = any(v_reservation_ids)
       )
     );

  insert into public.accessrevamp_audit_log (
    action,
    entity_type,
    entity_id,
    details
  ) values (
    'stale_checkout_reconciled',
    'payment_runtime',
    'singleton',
    jsonb_build_object(
      'reservation_count', v_reconciled,
      'reservation_ids', to_jsonb(v_reservation_ids),
      'reason', 'provider_expiry_elapsed_without_paid_order'
    )
  );

  return v_reconciled;
end;
$$;

revoke all on function public.reconcile_accessrevamp_stale_unpaid_checkouts()
  from public, anon, authenticated;
grant execute on function public.reconcile_accessrevamp_stale_unpaid_checkouts()
  to service_role;

create or replace function public.enforce_accessrevamp_webhook_liveness()
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_reconciled integer;
begin
  v_reconciled := public.reconcile_accessrevamp_stale_unpaid_checkouts();
  return v_reconciled > 0;
end;
$$;

revoke all on function public.enforce_accessrevamp_webhook_liveness()
  from public, anon, authenticated;
grant execute on function public.enforce_accessrevamp_webhook_liveness()
  to service_role;

select public.reconcile_accessrevamp_stale_unpaid_checkouts();
