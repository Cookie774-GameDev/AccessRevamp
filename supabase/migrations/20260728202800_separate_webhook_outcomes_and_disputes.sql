alter table public.payment_runtime_settings
  add column if not exists last_event_received_at timestamptz,
  add column if not exists last_checkout_event_processed_at timestamptz,
  add column if not exists last_fulfillment_succeeded_at timestamptz,
  add column if not exists last_refund_reconciled_at timestamptz,
  add column if not exists last_dispute_reconciled_at timestamptz;

create table if not exists public.payment_disputes (
  stripe_dispute_id text primary key,
  order_id uuid not null references public.orders(id) on delete restrict,
  stripe_event_id text not null unique,
  stripe_charge_id text not null,
  stripe_payment_intent_id text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency = lower(currency) and char_length(currency) = 3),
  status text not null check (status in (
    'warning_needs_response', 'warning_under_review', 'warning_closed',
    'needs_response', 'under_review', 'won', 'lost'
  )),
  reason text,
  evidence_due_by timestamptz,
  livemode boolean not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists payment_disputes_order_created_idx
  on public.payment_disputes (order_id, created_at desc);
alter table public.payment_disputes enable row level security;
revoke all on public.payment_disputes from public, anon, authenticated;
grant select, insert, update, delete on public.payment_disputes to service_role;

create or replace function public.reconcile_accessrevamp_dispute(p_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_event_id text := p_payload ->> 'event_id';
  v_event_type text := p_payload ->> 'event_type';
  v_livemode boolean := (p_payload ->> 'livemode')::boolean;
  v_dispute_id text := p_payload ->> 'stripe_dispute_id';
  v_charge_id text := p_payload ->> 'stripe_charge_id';
  v_payment_intent_id text := p_payload ->> 'payment_intent_id';
  v_amount integer := (p_payload ->> 'amount_cents')::integer;
  v_currency text := lower(p_payload ->> 'currency');
  v_status text := p_payload ->> 'status';
  v_reason text := nullif(p_payload ->> 'reason', '');
  v_due_by timestamptz := nullif(p_payload ->> 'evidence_due_at', '')::timestamptz;
  v_order public.orders%rowtype;
begin
  if v_event_id is null
     or v_event_type not in ('charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed')
     or v_dispute_id !~ '^dp_[A-Za-z0-9_]+$'
     or v_charge_id !~ '^ch_[A-Za-z0-9_]+$'
     or v_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$'
     or v_amount <= 0
     or v_currency !~ '^[a-z]{3}$'
     or v_status not in (
       'warning_needs_response', 'warning_under_review', 'warning_closed',
       'needs_response', 'under_review', 'won', 'lost'
     ) then
    raise exception 'Invalid normalized AccessRevamp dispute payload';
  end if;

  if exists (select 1 from public.stripe_events where id = v_event_id and processed_at is not null) then
    return true;
  end if;

  select orders.* into v_order
    from public.orders as orders
   where orders.stripe_payment_intent_id = v_payment_intent_id
   for update;
  if not found or v_amount > v_order.amount_total then
    raise exception 'Dispute did not match an AccessRevamp order';
  end if;

  insert into public.stripe_events (id, event_type, livemode, payload)
  values (v_event_id, v_event_type, v_livemode, p_payload)
  on conflict (id) do nothing;

  insert into public.payment_disputes (
    stripe_dispute_id, order_id, stripe_event_id, stripe_charge_id,
    stripe_payment_intent_id, amount_cents, currency, status, reason,
    evidence_due_by, livemode
  ) values (
    v_dispute_id, v_order.id, v_event_id, v_charge_id,
    v_payment_intent_id, v_amount, v_currency, v_status, v_reason,
    v_due_by, v_livemode
  )
  on conflict (stripe_dispute_id) do update
    set stripe_event_id = excluded.stripe_event_id,
        status = excluded.status,
        reason = excluded.reason,
        evidence_due_by = excluded.evidence_due_by,
        updated_at = timezone('utc', now());

  if v_status = 'won' then
    update public.orders
       set status = case
         when refunded_cents = 0 then 'paid'
         when refunded_cents >= amount_total then 'refunded'
         else 'partially_refunded'
       end,
       updated_at = timezone('utc', now())
     where id = v_order.id;
  else
    update public.orders
       set status = 'disputed', updated_at = timezone('utc', now())
     where id = v_order.id;
    update public.entitlements
       set status = 'suspended', updated_at = timezone('utc', now())
     where source_order_id = v_order.id and status = 'active';
    update public.customer_projects
       set status = 'paused', updated_at = timezone('utc', now())
     where order_id = v_order.id and status not in ('completed', 'canceled');
  end if;

  insert into public.accessrevamp_audit_log (action, entity_type, entity_id, details)
  values (
    'payment_dispute_' || v_status,
    'order',
    v_order.id::text,
    jsonb_build_object('stripe_dispute_id', v_dispute_id, 'amount_cents', v_amount)
  );
  update public.stripe_events set processed_at = timezone('utc', now()) where id = v_event_id;
  return true;
end;
$$;

alter function public.reconcile_accessrevamp_dispute(jsonb) owner to postgres;
revoke all on function public.reconcile_accessrevamp_dispute(jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_accessrevamp_dispute(jsonb) to service_role;

create or replace function public.record_accessrevamp_webhook_outcome(
  p_event_type text,
  p_outcome text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_now timestamptz := timezone('utc', now());
begin
  if p_event_type is null
     or p_outcome not in (
       'ignored', 'checkout_observed', 'checkout_closed',
       'fulfillment', 'refund', 'dispute'
     ) then
    raise exception 'Invalid webhook outcome';
  end if;

  update public.payment_runtime_settings
     set last_event_received_at = v_now,
         last_checkout_event_processed_at = case
           when p_outcome in ('checkout_observed', 'checkout_closed', 'fulfillment') then v_now
           else last_checkout_event_processed_at
         end,
         last_fulfillment_succeeded_at = case
           when p_outcome = 'fulfillment' then v_now else last_fulfillment_succeeded_at
         end,
         last_refund_reconciled_at = case
           when p_outcome = 'refund' then v_now else last_refund_reconciled_at
         end,
         last_dispute_reconciled_at = case
           when p_outcome = 'dispute' then v_now else last_dispute_reconciled_at
         end,
         last_successful_webhook_at = case
           when p_outcome in ('checkout_observed', 'checkout_closed', 'fulfillment', 'refund', 'dispute')
             then v_now
           else last_successful_webhook_at
         end
   where singleton = true;
  return found;
end;
$$;

alter function public.record_accessrevamp_webhook_outcome(text, text) owner to postgres;
revoke all on function public.record_accessrevamp_webhook_outcome(text, text) from public, anon, authenticated;
grant execute on function public.record_accessrevamp_webhook_outcome(text, text) to service_role;
