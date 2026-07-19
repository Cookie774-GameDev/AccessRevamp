-- Serialize upgrade quotes by user before a Stripe Checkout Session exists.
-- The RPC is service-only: browser roles cannot choose prices, amounts, credit,
-- identities, or Stripe identifiers.

create or replace function public.reserve_accessrevamp_upgrade(
  p_user_id uuid,
  p_target_tier_key text,
  p_request_id uuid
)
returns table (
  reservation_id uuid,
  from_tier text,
  to_tier text,
  gross_cents integer,
  credit_cents integer,
  net_cents integer,
  source_entitlement_id uuid,
  expires_at timestamptz,
  is_existing boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_existing public.upgrade_reservations%rowtype;
  v_created public.upgrade_reservations%rowtype;
  v_live_reservation_id uuid;
  v_target_rank smallint;
  v_gross_cents integer;
  v_current_rank smallint := 0;
  v_current_tier_key text;
  v_current_list_price_cents integer := 0;
  v_effective_paid_cents integer := 0;
  v_entitlement_id uuid;
  v_source_order_status text;
  v_credit_cents integer := 0;
  v_net_cents integer;
begin
  if p_user_id is null or p_request_id is null or p_target_tier_key is null then
    raise exception using
      errcode = '22004',
      message = 'AccessRevamp upgrade reservation inputs are required';
  end if;

  -- A transaction-scoped lock gives every user one reservation decision at a
  -- time, including users who do not yet have an entitlement row to lock.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  update public.upgrade_reservations
     set status = 'expired',
         updated_at = v_now
   where user_id = p_user_id
     and status in ('reserved', 'checkout_created')
     and expires_at <= v_now;

  select reservation.*
    into v_existing
    from public.upgrade_reservations as reservation
   where reservation.user_id = p_user_id
     and reservation.idempotency_key = p_request_id
   for update;

  if found then
    if v_existing.status in ('reserved', 'checkout_created')
       and v_existing.expires_at > v_now then
      return query
      select
        v_existing.id,
        v_existing.from_tier_key,
        v_existing.to_tier_key,
        v_existing.gross_cents,
        v_existing.credit_cents,
        v_existing.net_cents,
        v_existing.source_entitlement_id,
        v_existing.expires_at,
        true;
      return;
    end if;

    raise exception using
      errcode = '22023',
      message = 'AccessRevamp request ID has already reached a terminal state';
  end if;

  select catalog."rank", catalog.list_price_cents
    into v_target_rank, v_gross_cents
    from public.tier_catalog as catalog
   where catalog.tier_key = p_target_tier_key
     and catalog.active = true
     and catalog.list_price_cents > 0
   for key share;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Unknown or inactive AccessRevamp target tier';
  end if;

  -- The locked entitlement is the durable highest settled value. Its source
  -- order must still be paid (never refunded, partially refunded, or disputed)
  -- before that value can become upgrade credit.
  select
      entitlement.id,
      entitlement.highest_tier_key,
      tier_current."rank",
      tier_current.list_price_cents,
      entitlement.effective_paid_cents,
      source_order.status
    into
      v_entitlement_id,
      v_current_tier_key,
      v_current_rank,
      v_current_list_price_cents,
      v_effective_paid_cents,
      v_source_order_status
    from public.entitlements as entitlement
    join public.tier_catalog as tier_current
      on tier_current.tier_key = entitlement.highest_tier_key
    left join public.orders as source_order
      on source_order.id = entitlement.source_order_id
   where entitlement.user_id = p_user_id
     and entitlement.status = 'active'
   order by tier_current."rank" desc, entitlement.effective_paid_cents desc
   limit 1
   for update of entitlement;

  if found then
    if v_source_order_status is distinct from 'paid'
       or v_effective_paid_cents <> v_current_list_price_cents then
      raise exception using
        errcode = '55000',
        message = 'AccessRevamp entitlement settlement requires review';
    end if;
  else
    v_current_rank := 0;
    v_current_tier_key := null;
    v_current_list_price_cents := 0;
    v_effective_paid_cents := 0;
    v_entitlement_id := null;
  end if;

  if v_current_rank >= v_target_rank then
    raise exception using
      errcode = '22023',
      message = 'AccessRevamp target must be higher than the current entitlement';
  end if;

  v_credit_cents := least(v_effective_paid_cents, v_gross_cents);
  v_net_cents := v_gross_cents - v_credit_cents;

  if v_net_cents <= 0 then
    raise exception using
      errcode = '22023',
      message = 'AccessRevamp upgrade does not require a paid Checkout Session';
  end if;

  -- The advisory lock makes this query-and-insert decision atomic even when
  -- concurrent requests target different higher tiers.
  select reservation.id
    into v_live_reservation_id
    from public.upgrade_reservations as reservation
   where reservation.user_id = p_user_id
     and reservation.status in ('reserved', 'checkout_created')
     and reservation.expires_at > v_now
   order by reservation.created_at
   limit 1
   for update;

  if found then
    raise exception using
      errcode = '55000',
      message = 'An AccessRevamp upgrade reservation is already active';
  end if;

  insert into public.upgrade_reservations (
    user_id,
    from_tier_key,
    to_tier_key,
    gross_cents,
    credit_cents,
    net_cents,
    status,
    expires_at,
    idempotency_key,
    source_entitlement_id
  )
  values (
    p_user_id,
    v_current_tier_key,
    p_target_tier_key,
    v_gross_cents,
    v_credit_cents,
    v_net_cents,
    'reserved',
    v_now + interval '30 minutes',
    p_request_id,
    v_entitlement_id
  )
  returning * into v_created;

  return query
  select
    v_created.id,
    v_created.from_tier_key,
    v_created.to_tier_key,
    v_created.gross_cents,
    v_created.credit_cents,
    v_created.net_cents,
    v_created.source_entitlement_id,
    v_created.expires_at,
    false;
end;
$$;

alter function public.reserve_accessrevamp_upgrade(uuid, text, uuid) owner to postgres;
revoke all on function public.reserve_accessrevamp_upgrade(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.reserve_accessrevamp_upgrade(uuid, text, uuid) to service_role;

comment on function public.reserve_accessrevamp_upgrade(uuid, text, uuid) is
  'Service-only cumulative-credit reservation. Serializes by user, reuses only live identical requests, and returns no Stripe identifier.';

-- New payment records retain the historical order columns while attaching the
-- exact reservation arithmetic required for full purchases and upgrades.
alter table public.orders
  add column if not exists reservation_id uuid references public.upgrade_reservations(id) on delete restrict,
  add column if not exists gross_cents integer,
  add column if not exists credit_cents integer,
  add column if not exists net_cents integer,
  add column if not exists stripe_price_id text,
  add column if not exists checkout_request_id uuid,
  add column if not exists refunded_cents integer not null default 0;

create unique index if not exists orders_reservation_id_uidx
  on public.orders (reservation_id)
  where reservation_id is not null;
create unique index if not exists orders_checkout_request_id_uidx
  on public.orders (checkout_request_id)
  where checkout_request_id is not null;

alter table public.orders drop constraint if exists orders_plan_key_check;
alter table public.orders add constraint orders_plan_key_check check (
  plan_key in ('homepage_reveal', 'quick_fix', 'complete_revamp', 'cinematic_scroll')
);
alter table public.orders drop constraint if exists orders_amount_total_check;
alter table public.orders add constraint orders_amount_total_check check (
  (
    reservation_id is null
    and (
      (plan_key = 'homepage_reveal' and amount_total = 5000)
      or (plan_key = 'quick_fix' and amount_total = 19900)
      or (plan_key = 'cinematic_scroll' and amount_total = 25000)
    )
  )
  or (
    reservation_id is not null
    and plan_key in ('homepage_reveal', 'complete_revamp', 'cinematic_scroll')
    and gross_cents = case plan_key
      when 'homepage_reveal' then 5000
      when 'complete_revamp' then 20000
      when 'cinematic_scroll' then 25000
    end
    and credit_cents in (0, 5000, 20000)
    and net_cents = gross_cents - credit_cents
    and amount_total = net_cents
    and net_cents > 0
    and checkout_request_id is not null
    and stripe_price_id ~ '^price_[A-Za-z0-9_]+$'
  )
);
alter table public.orders drop constraint if exists orders_refunded_cents_check;
alter table public.orders add constraint orders_refunded_cents_check
  check (refunded_cents between 0 and amount_total);

alter table public.customer_projects drop constraint if exists customer_projects_plan_key_check;
alter table public.customer_projects add constraint customer_projects_plan_key_check
  check (plan_key in ('homepage_reveal', 'quick_fix', 'complete_revamp', 'cinematic_scroll'));

create table if not exists public.payment_refunds (
  stripe_refund_id text primary key,
  order_id uuid not null references public.orders(id) on delete restrict,
  stripe_event_id text not null,
  refund_amount_cents integer not null check (refund_amount_cents > 0),
  cumulative_refunded_cents integer not null check (cumulative_refunded_cents >= 0),
  status text not null check (status in ('pending', 'succeeded', 'failed', 'canceled')),
  reason text,
  operator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);
create index if not exists payment_refunds_order_id_idx
  on public.payment_refunds (order_id, created_at desc);
create index if not exists payment_refunds_stripe_event_id_idx
  on public.payment_refunds (stripe_event_id);
alter table public.payment_refunds enable row level security;
revoke all on table public.payment_refunds from public, anon, authenticated;
grant all on table public.payment_refunds to service_role;

alter table public.refund_requests
  add column if not exists refund_amount_cents integer,
  add column if not exists provider_reason text,
  add column if not exists operator_id uuid references auth.users(id) on delete set null,
  add column if not exists processed_at timestamptz;
alter table public.refund_requests drop constraint if exists refund_requests_status_check;
alter table public.refund_requests add constraint refund_requests_status_check check (status in (
  'requested', 'approved', 'declined', 'processing', 'partially_refunded', 'refunded', 'canceled'
));
alter table public.refund_requests drop constraint if exists refund_requests_resolution_fields_check;
alter table public.refund_requests add constraint refund_requests_resolution_fields_check check (
  (status in ('requested', 'processing') and resolved_at is null)
  or (status in ('approved', 'declined', 'partially_refunded', 'refunded', 'canceled') and resolved_at is not null)
);
alter table public.refund_requests drop constraint if exists refund_requests_stripe_refund_check;
alter table public.refund_requests add constraint refund_requests_stripe_refund_check check (
  status not in ('partially_refunded', 'refunded')
  or (stripe_refund_id is not null and refund_amount_cents is not null and refund_amount_cents > 0)
);
create unique index if not exists refund_requests_stripe_refund_id_uidx
  on public.refund_requests (stripe_refund_id)
  where stripe_refund_id is not null;

create or replace function public.fulfill_accessrevamp_checkout(p_payload jsonb)
returns table (
  order_id uuid,
  entitlement_id uuid,
  project_id uuid,
  is_duplicate boolean
)
language plpgsql
security definer
set search_path = pg_catalog
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
    select orders.id into v_order_id from public.orders as orders
     where orders.stripe_checkout_session_id = v_session_id;
    select entitlements.id into v_entitlement_id from public.entitlements as entitlements
     where entitlements.user_id = v_user_id and entitlements.status = 'active';
    select projects.id into v_project_id from public.customer_projects as projects
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
     or pg_catalog.coalesce(v_reservation.from_tier_key, 'none') <> v_from_tier
     or v_reservation.gross_cents <> v_gross
     or v_reservation.credit_cents <> v_credit
     or v_reservation.net_cents <> v_net
     or v_session_created_at > v_reservation.expires_at then
    raise exception 'Checkout reservation did not match fulfillment payload';
  end if;

  insert into public.orders (
    user_id, stripe_event_id, stripe_checkout_session_id,
    stripe_payment_intent_id, stripe_customer_id, customer_email,
    plan_key, amount_total, currency, status, reservation_id,
    gross_cents, credit_cents, net_cents, stripe_price_id, checkout_request_id
  ) values (
    v_user_id, v_event_id, v_session_id,
    v_payment_intent_id, nullif(v_customer_id, ''), v_customer_email,
    v_to_tier, v_net, 'usd', 'paid', v_reservation_id,
    v_gross, v_credit, v_net, v_price_id, v_request_id
  )
  on conflict (stripe_checkout_session_id) do update
    set status = 'paid', updated_at = pg_catalog.now()
  returning public.orders.id into v_order_id;

  update public.upgrade_reservations
     set status = 'paid', updated_at = pg_catalog.now()
   where id = v_reservation_id;

  if v_reservation.source_entitlement_id is not null then
    select entitlement.source_order_id into v_base_order_id
      from public.entitlements as entitlement
     where entitlement.id = v_reservation.source_entitlement_id;
  end if;

  insert into public.entitlements (
    user_id, highest_tier_key, status, source_order_id, effective_paid_cents
  ) values (
    v_user_id, v_to_tier, 'active', v_order_id, v_gross
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
  on conflict (order_id) do update set updated_at = pg_catalog.now()
  returning public.customer_projects.id into v_project_id;

  if v_base_order_id is not null and v_base_order_id <> v_order_id then
    insert into public.refund_dependencies (base_order_id, dependent_order_id)
    values (v_base_order_id, v_order_id)
    on conflict (base_order_id, dependent_order_id) do nothing;
  end if;

  insert into public.accessrevamp_audit_log (
    actor_id, action, entity_type, entity_id, details
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

  update public.stripe_events set processed_at = pg_catalog.now() where id = v_event_id;
  return query select v_order_id, v_entitlement_id, v_project_id, false;
end;
$$;

alter function public.fulfill_accessrevamp_checkout(jsonb) owner to postgres;
revoke all on function public.fulfill_accessrevamp_checkout(jsonb) from public, anon, authenticated;
grant execute on function public.fulfill_accessrevamp_checkout(jsonb) to service_role;

create or replace function public.close_accessrevamp_checkout(p_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_event_id text := p_payload ->> 'event_id';
  v_event_type text := p_payload ->> 'event_type';
  v_livemode boolean := (p_payload ->> 'livemode')::boolean;
  v_reservation_id uuid := (p_payload ->> 'reservation_id')::uuid;
  v_session_id text := p_payload ->> 'checkout_session_id';
  v_terminal_status text := p_payload ->> 'terminal_status';
  v_existing_processed timestamptz;
begin
  if v_event_id is null
     or v_livemode is null
     or v_reservation_id is null
     or v_session_id is null
     or v_event_type not in ('checkout.session.async_payment_failed', 'checkout.session.expired')
     or v_terminal_status not in ('canceled', 'expired') then
    raise exception 'Invalid terminal Checkout event';
  end if;
  select processed_at into v_existing_processed from public.stripe_events where id = v_event_id for update;
  if found and v_existing_processed is not null then return true; end if;
  insert into public.stripe_events (id, event_type, livemode, payload)
  values (v_event_id, v_event_type, v_livemode, p_payload)
  on conflict (id) do nothing;
  update public.upgrade_reservations
     set status = v_terminal_status, updated_at = pg_catalog.now()
   where id = v_reservation_id
     and checkout_session_id = v_session_id
     and status in ('reserved', 'checkout_created');
  if not found then raise exception 'Terminal Checkout reservation did not match'; end if;
  insert into public.accessrevamp_audit_log (action, entity_type, entity_id, details)
  values ('checkout_' || v_terminal_status, 'upgrade_reservation', v_reservation_id::text,
    pg_catalog.jsonb_build_object('event_type', v_event_type));
  update public.stripe_events set processed_at = pg_catalog.now() where id = v_event_id;
  return true;
end;
$$;

alter function public.close_accessrevamp_checkout(jsonb) owner to postgres;
revoke all on function public.close_accessrevamp_checkout(jsonb) from public, anon, authenticated;
grant execute on function public.close_accessrevamp_checkout(jsonb) to service_role;

create or replace function public.reconcile_accessrevamp_refund(p_payload jsonb)
returns table (order_id uuid, refunded_cents integer, entitlement_status text, is_duplicate boolean)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_event_id text := p_payload ->> 'event_id';
  v_event_type text := p_payload ->> 'event_type';
  v_livemode boolean := (p_payload ->> 'livemode')::boolean;
  v_refund_id text := p_payload ->> 'stripe_refund_id';
  v_payment_intent_id text := p_payload ->> 'payment_intent_id';
  v_refund_amount integer := (p_payload ->> 'refund_amount_cents')::integer;
  v_cumulative integer := (p_payload ->> 'cumulative_refunded_cents')::integer;
  v_refund_status text := p_payload ->> 'refund_status';
  v_reason text := nullif(p_payload ->> 'reason', '');
  v_operator_id uuid := nullif(p_payload ->> 'operator_id', '')::uuid;
  v_refund_delta integer;
  v_order public.orders%rowtype;
  v_entitlement_status text;
  v_processed_at timestamptz;
begin
  if v_event_id is null
     or v_livemode is null
     or v_payment_intent_id is null
     or v_event_type not in ('charge.refunded', 'refund.updated')
     or v_refund_id !~ '^(re_|charge_aggregate_)[A-Za-z0-9_]+'
     or v_refund_status not in ('pending', 'succeeded', 'failed', 'canceled')
     or v_refund_amount <= 0
     or v_cumulative < 0
     or (v_refund_status = 'succeeded' and v_cumulative <= 0) then
    raise exception 'Invalid normalized AccessRevamp refund payload';
  end if;

  select events.processed_at into v_processed_at from public.stripe_events as events
   where events.id = v_event_id for update;
  if found and v_processed_at is not null then
    select orders.* into v_order from public.orders as orders
     where orders.stripe_payment_intent_id = v_payment_intent_id;
    select entitlements.status into v_entitlement_status from public.entitlements as entitlements
     where entitlements.user_id = v_order.user_id order by entitlements.updated_at desc limit 1;
    return query select v_order.id, v_order.refunded_cents, v_entitlement_status, true;
    return;
  end if;

  select orders.* into v_order from public.orders as orders
   where orders.stripe_payment_intent_id = v_payment_intent_id for update;
  if not found or v_cumulative > v_order.amount_total then
    raise exception 'Refund did not match an AccessRevamp order';
  end if;
  v_refund_delta := greatest(0, v_cumulative - v_order.refunded_cents);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_order.user_id::text, 0));

  insert into public.stripe_events (id, event_type, livemode, payload)
  values (v_event_id, v_event_type, v_livemode, p_payload)
  on conflict (id) do nothing;

  insert into public.payment_refunds (
    stripe_refund_id, order_id, stripe_event_id, refund_amount_cents,
    cumulative_refunded_cents, status, reason, operator_id
  ) values (
    v_refund_id, v_order.id, v_event_id, v_refund_amount,
    v_cumulative, v_refund_status, v_reason, v_operator_id
  )
  on conflict (stripe_refund_id) do update
    set cumulative_refunded_cents = greatest(public.payment_refunds.cumulative_refunded_cents, excluded.cumulative_refunded_cents),
        status = excluded.status,
        reason = coalesce(excluded.reason, public.payment_refunds.reason),
        operator_id = coalesce(excluded.operator_id, public.payment_refunds.operator_id),
        updated_at = pg_catalog.now();

  if v_refund_status <> 'succeeded' then
    select entitlements.status into v_entitlement_status
      from public.entitlements as entitlements
     where entitlements.user_id = v_order.user_id
     order by entitlements.updated_at desc
     limit 1;
    insert into public.accessrevamp_audit_log (actor_id, action, entity_type, entity_id, details)
    values (
      v_operator_id,
      'refund_' || v_refund_status,
      'order',
      v_order.id::text,
      pg_catalog.jsonb_build_object('refund_amount_cents', v_refund_amount)
    );
    update public.stripe_events set processed_at = pg_catalog.now() where id = v_event_id;
    return query select v_order.id, v_order.refunded_cents, coalesce(v_entitlement_status, 'unchanged'), false;
    return;
  end if;

  update public.orders
     set refunded_cents = greatest(refunded_cents, v_cumulative),
         status = case when v_cumulative = amount_total then 'refunded' else 'partially_refunded' end,
         updated_at = pg_catalog.now()
   where id = v_order.id;

  with recursive affected_orders(order_id) as (
    select v_order.id
    union
    select dependencies.dependent_order_id
      from public.refund_dependencies as dependencies
      join affected_orders as affected
        on affected.order_id = dependencies.base_order_id
     where dependencies.status = 'open'
  )
  update public.entitlements
     set effective_paid_cents = greatest(0, effective_paid_cents - v_refund_delta),
         status = 'suspended',
         updated_at = pg_catalog.now()
   where user_id = v_order.user_id
     and status = 'active'
     and source_order_id in (select affected_orders.order_id from affected_orders)
  returning status into v_entitlement_status;

  with recursive affected_orders(order_id) as (
    select v_order.id
    union
    select dependencies.dependent_order_id
      from public.refund_dependencies as dependencies
      join affected_orders as affected
        on affected.order_id = dependencies.base_order_id
     where dependencies.status = 'open'
  )
  update public.refund_dependencies
     set status = 'resolved',
         resolved_at = pg_catalog.now(),
         resolution = 'Refund recorded; dependent entitlement suspended for operator review.'
   where base_order_id in (select affected_orders.order_id from affected_orders)
     and status = 'open';

  update public.refund_requests
     set status = case when v_cumulative = v_order.amount_total then 'refunded' else 'partially_refunded' end,
         stripe_refund_id = v_refund_id,
         refund_amount_cents = v_refund_amount,
         provider_reason = v_reason,
         operator_id = v_operator_id,
         processed_at = pg_catalog.now(),
         resolved_at = pg_catalog.now(),
         resolution_note = 'Provider refund confirmed; entitlement state recomputed.',
         updated_at = pg_catalog.now()
   where order_id = v_order.id
     and status in ('requested', 'approved', 'processing');

  insert into public.accessrevamp_audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    v_operator_id,
    case when v_cumulative = v_order.amount_total then 'payment_refunded' else 'payment_partially_refunded' end,
    'order',
    v_order.id::text,
    pg_catalog.jsonb_build_object(
      'refund_amount_cents', v_refund_amount,
      'cumulative_refunded_cents', v_cumulative,
      'entitlement_status', coalesce(v_entitlement_status, 'unchanged')
    )
  );
  update public.stripe_events set processed_at = pg_catalog.now() where id = v_event_id;
  return query select v_order.id, v_cumulative, coalesce(v_entitlement_status, 'unchanged'), false;
end;
$$;

alter function public.reconcile_accessrevamp_refund(jsonb) owner to postgres;
revoke all on function public.reconcile_accessrevamp_refund(jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_accessrevamp_refund(jsonb) to service_role;
