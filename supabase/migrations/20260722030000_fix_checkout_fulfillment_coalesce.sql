-- PostgreSQL COALESCE is syntax, not a pg_catalog-qualified function. The prior
-- fulfillment definition attempted to call pg_catalog.coalesce(...) and failed
-- before any paid order could be persisted. Recreate the function with the same
-- payment and idempotency checks using valid COALESCE syntax.

create or replace function public.fulfill_accessrevamp_checkout(p_payload jsonb)
returns table(order_id uuid, entitlement_id uuid, project_id uuid, is_duplicate boolean)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event_id text := p_payload ->> 'event_id';
  v_event_type text := p_payload ->> 'event_type';
  v_livemode boolean := (p_payload ->> 'livemode')::boolean;
  v_user_id uuid := (p_payload ->> 'user_id')::uuid;
  v_reservation_id uuid := (p_payload ->> 'reservation_id')::uuid;
  v_session_id text := p_payload ->> 'checkout_session_id';
  v_payment_intent_id text := p_payload ->> 'payment_intent_id';
  v_customer_id text := p_payload ->> 'customer_id';
  v_customer_email text := pg_catalog.lower(pg_catalog.btrim(p_payload ->> 'customer_email'));
  v_price_id text := p_payload ->> 'stripe_price_id';
  v_request_id uuid := (p_payload ->> 'checkout_request_id')::uuid;
  v_from_tier text := p_payload ->> 'from_tier';
  v_to_tier text := p_payload ->> 'to_tier';
  v_gross integer := (p_payload ->> 'gross_cents')::integer;
  v_credit integer := (p_payload ->> 'credit_cents')::integer;
  v_net integer := (p_payload ->> 'net_cents')::integer;
  v_session_created_at timestamptz := pg_catalog.to_timestamp((p_payload ->> 'session_created')::double precision);
  v_reservation public.upgrade_reservations%rowtype;
  v_order_id uuid;
  v_entitlement_id uuid;
  v_project_id uuid;
  v_base_order_id uuid;
  v_processed_at timestamptz;
begin
  if v_event_id is null
     or v_event_type is null
     or v_livemode is null
     or v_user_id is null
     or v_reservation_id is null
     or v_event_id !~ '^evt_[A-Za-z0-9_]+'
     or v_event_type not in ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
     or v_session_id !~ '^cs_(test|live)_[A-Za-z0-9_]+'
     or v_payment_intent_id !~ '^pi_[A-Za-z0-9_]+'
     or v_price_id !~ '^price_[A-Za-z0-9_]+'
     or v_customer_email is null
     or v_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+$'
     or v_to_tier not in ('homepage_reveal', 'complete_revamp', 'cinematic_scroll')
     or v_from_tier not in ('none', 'homepage_reveal', 'complete_revamp')
     or v_net <> v_gross - v_credit
     or v_net <= 0 then
    raise exception 'Invalid normalized AccessRevamp fulfillment payload';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));

  select events.processed_at into v_processed_at
    from public.stripe_events as events
   where events.id = v_event_id
   for update;

  if found and v_processed_at is not null then
    select orders.id into v_order_id
      from public.orders as orders
     where orders.stripe_checkout_session_id = v_session_id;
    select entitlements.id into v_entitlement_id
      from public.entitlements as entitlements
     where entitlements.user_id = v_user_id
       and entitlements.status = 'active';
    select projects.id into v_project_id
      from public.customer_projects as projects
     where projects.order_id = v_order_id;
    return query select v_order_id, v_entitlement_id, v_project_id, true;
    return;
  end if;

  insert into public.stripe_events (id, event_type, livemode, payload)
  values (v_event_id, v_event_type, v_livemode, p_payload)
  on conflict (id) do nothing;

  select reservation.* into v_reservation
    from public.upgrade_reservations as reservation
   where reservation.id = v_reservation_id
     and reservation.user_id = v_user_id
   for update;

  if not found
     or v_reservation.status not in ('reserved', 'checkout_created')
     or v_reservation.checkout_session_id is distinct from v_session_id
     or v_reservation.stripe_price_id is distinct from v_price_id
     or v_reservation.idempotency_key <> v_request_id
     or v_reservation.to_tier_key <> v_to_tier
     or coalesce(v_reservation.from_tier_key, 'none') <> v_from_tier
     or v_reservation.gross_cents <> v_gross
     or v_reservation.credit_cents <> v_credit
     or v_reservation.net_cents <> v_net
     or v_session_created_at > v_reservation.expires_at then
    raise exception 'Checkout reservation did not match fulfillment payload';
  end if;

  insert into public.orders (
    user_id,
    stripe_event_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_customer_id,
    customer_email,
    plan_key,
    amount_total,
    currency,
    status,
    reservation_id,
    gross_cents,
    credit_cents,
    net_cents,
    stripe_price_id,
    checkout_request_id
  ) values (
    v_user_id,
    v_event_id,
    v_session_id,
    v_payment_intent_id,
    nullif(v_customer_id, ''),
    v_customer_email,
    v_to_tier,
    v_net,
    'usd',
    'paid',
    v_reservation_id,
    v_gross,
    v_credit,
    v_net,
    v_price_id,
    v_request_id
  )
  on conflict (stripe_checkout_session_id) do update
    set status = 'paid',
        updated_at = pg_catalog.now()
  returning public.orders.id into v_order_id;

  update public.upgrade_reservations
     set status = 'paid',
         updated_at = pg_catalog.now()
   where id = v_reservation_id;

  if v_reservation.source_entitlement_id is not null then
    select entitlement.source_order_id into v_base_order_id
      from public.entitlements as entitlement
     where entitlement.id = v_reservation.source_entitlement_id;
  end if;

  insert into public.entitlements (
    user_id,
    highest_tier_key,
    status,
    source_order_id,
    effective_paid_cents
  ) values (
    v_user_id,
    v_to_tier,
    'active',
    v_order_id,
    v_gross
  )
  on conflict (user_id) where status = 'active' do update
    set highest_tier_key = excluded.highest_tier_key,
        source_order_id = excluded.source_order_id,
        effective_paid_cents = excluded.effective_paid_cents,
        updated_at = pg_catalog.now()
  returning public.entitlements.id into v_entitlement_id;

  insert into public.customer_projects (user_id, order_id, name, plan_key, status)
  values (
    v_user_id,
    v_order_id,
    case v_to_tier
      when 'homepage_reveal' then 'Homepage Reveal project'
      when 'complete_revamp' then 'Complete Website Revamp project'
      else 'Cinematic Scroll Site project'
    end,
    v_to_tier,
    'intake_pending'
  )
  on conflict (order_id) do update
    set updated_at = pg_catalog.now()
  returning public.customer_projects.id into v_project_id;

  if v_base_order_id is not null and v_base_order_id <> v_order_id then
    insert into public.refund_dependencies (base_order_id, dependent_order_id)
    values (v_base_order_id, v_order_id)
    on conflict (base_order_id, dependent_order_id) do nothing;
  end if;

  insert into public.accessrevamp_audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    v_user_id,
    'checkout_fulfilled',
    'order',
    v_order_id::text,
    pg_catalog.jsonb_build_object(
      'target_tier', v_to_tier,
      'gross_cents', v_gross,
      'credit_cents', v_credit,
      'net_cents', v_net,
      'event_type', v_event_type
    )
  );

  update public.stripe_events
     set processed_at = pg_catalog.now()
   where id = v_event_id;

  return query select v_order_id, v_entitlement_id, v_project_id, false;
end;
$$;

revoke all on function public.fulfill_accessrevamp_checkout(jsonb) from public, anon, authenticated;
grant execute on function public.fulfill_accessrevamp_checkout(jsonb) to service_role;

comment on function public.fulfill_accessrevamp_checkout(jsonb) is
  'Idempotently fulfills a server-verified paid Checkout reservation into an order, entitlement, customer project, workflow, and audit record.';
