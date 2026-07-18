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

  select catalog.rank, catalog.list_price_cents
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
      current_catalog.rank,
      current_catalog.list_price_cents,
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
    join public.tier_catalog as current_catalog
      on current_catalog.tier_key = entitlement.highest_tier_key
    left join public.orders as source_order
      on source_order.id = entitlement.source_order_id
   where entitlement.user_id = p_user_id
     and entitlement.status = 'active'
   order by current_catalog.rank desc, entitlement.effective_paid_cents desc
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
