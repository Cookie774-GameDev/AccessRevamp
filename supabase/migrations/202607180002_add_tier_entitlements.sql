-- Canonical AccessRevamp tiers, durable customer entitlements, short-lived
-- upgrade reservations, and explicit refund-credit dependencies.
--
-- This migration intentionally does not create Stripe objects or store live
-- credentials. Stripe identifiers remain nullable, server-managed references.

create table if not exists public.tier_catalog (
  tier_key text primary key,
  rank smallint not null unique,
  list_price_cents integer not null,
  active boolean not null default true,
  stripe_full_price_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tier_catalog_exact_definition_check check (
    (tier_key = 'free_snapshot' and rank = 0 and list_price_cents = 0)
    or (tier_key = 'homepage_reveal' and rank = 1 and list_price_cents = 5000)
    or (tier_key = 'complete_revamp' and rank = 2 and list_price_cents = 20000)
    or (tier_key = 'cinematic_scroll' and rank = 3 and list_price_cents = 25000)
  ),
  constraint tier_catalog_stripe_reference_check check (
    stripe_full_price_id is null
    or stripe_full_price_id ~ '^price_[A-Za-z0-9_]+$'
  )
);

insert into public.tier_catalog (tier_key, rank, list_price_cents, active)
values
  ('free_snapshot', 0, 0, true),
  ('homepage_reveal', 1, 5000, true),
  ('complete_revamp', 2, 20000, true),
  ('cinematic_scroll', 3, 25000, true)
on conflict (tier_key) do update
set rank = excluded.rank,
    list_price_cents = excluded.list_price_cents,
    active = excluded.active,
    updated_at = timezone('utc', now());

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  highest_tier_key text not null references public.tier_catalog(tier_key) on update cascade,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'revoked')),
  source_order_id uuid references public.orders(id) on delete set null,
  effective_paid_cents integer not null default 0
    check (effective_paid_cents between 0 and 25000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint entitlements_paid_tier_check check (
    highest_tier_key in ('homepage_reveal', 'complete_revamp', 'cinematic_scroll')
  )
);

create unique index if not exists entitlements_one_active_per_user_uidx
  on public.entitlements (user_id)
  where (status = 'active');
create index if not exists entitlements_user_id_idx
  on public.entitlements (user_id);
create index if not exists entitlements_source_order_id_idx
  on public.entitlements (source_order_id)
  where source_order_id is not null;

create table if not exists public.upgrade_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_tier_key text references public.tier_catalog(tier_key) on update cascade,
  to_tier_key text not null references public.tier_catalog(tier_key) on update cascade,
  gross_cents integer not null check (gross_cents in (5000, 20000, 25000)),
  credit_cents integer not null default 0
    check (credit_cents >= 0 and credit_cents <= gross_cents),
  net_cents integer not null,
  stripe_price_id text,
  status text not null default 'reserved' check (status in (
    'reserved',
    'checkout_created',
    'paid',
    'expired',
    'canceled',
    'reversed'
  )),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '30 minutes'),
  idempotency_key uuid not null,
  checkout_session_id text unique,
  source_entitlement_id uuid references public.entitlements(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint upgrade_reservations_target_check check (
    to_tier_key in ('homepage_reveal', 'complete_revamp', 'cinematic_scroll')
  ),
  constraint upgrade_reservations_transition_check check (
    (from_tier_key is null and credit_cents = 0)
    or (
      from_tier_key = 'homepage_reveal'
      and to_tier_key in ('complete_revamp', 'cinematic_scroll')
      and credit_cents = 5000
    )
    or (
      from_tier_key = 'complete_revamp'
      and to_tier_key = 'cinematic_scroll'
      and credit_cents = 20000
    )
  ),
  constraint upgrade_reservations_arithmetic_check check (
    net_cents = gross_cents - credit_cents
  ),
  constraint upgrade_reservations_expiry_check check (
    expires_at > created_at
    and expires_at <= created_at + interval '30 minutes'
  ),
  constraint upgrade_reservations_stripe_reference_check check (
    stripe_price_id is null or stripe_price_id ~ '^price_[A-Za-z0-9_]+$'
  ),
  constraint upgrade_reservations_checkout_reference_check check (
    checkout_session_id is null or checkout_session_id ~ '^cs_(test|live)_[A-Za-z0-9_]+$'
  ),
  constraint upgrade_reservations_idempotency_unique unique (user_id, idempotency_key)
);

create unique index if not exists upgrade_reservations_one_live_transition_uidx
  on public.upgrade_reservations (user_id, to_tier_key)
  where (status in ('reserved', 'checkout_created'));
create index if not exists upgrade_reservations_user_status_expiry_idx
  on public.upgrade_reservations (user_id, status, expires_at);
create index if not exists upgrade_reservations_source_entitlement_id_idx
  on public.upgrade_reservations (source_entitlement_id)
  where source_entitlement_id is not null;

create table if not exists public.refund_dependencies (
  base_order_id uuid not null references public.orders(id) on delete restrict,
  dependent_order_id uuid not null references public.orders(id) on delete restrict,
  dependency_type text not null default 'upgrade_credit'
    check (dependency_type in ('upgrade_credit')),
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolution text,
  primary key (base_order_id, dependent_order_id),
  constraint refund_dependencies_distinct_orders_check check (
    base_order_id <> dependent_order_id
  ),
  constraint refund_dependencies_resolution_check check (
    (status = 'open' and resolved_at is null and resolution is null)
    or (
      status in ('resolved', 'dismissed')
      and resolved_at is not null
      and char_length(trim(resolution)) between 10 and 2000
    )
  )
);

create index if not exists refund_dependencies_dependent_order_id_idx
  on public.refund_dependencies (dependent_order_id);
create index if not exists refund_dependencies_open_base_order_idx
  on public.refund_dependencies (base_order_id, created_at)
  where status = 'open';

drop trigger if exists tier_catalog_accessrevamp_updated_at on public.tier_catalog;
create trigger tier_catalog_accessrevamp_updated_at
before update on public.tier_catalog
for each row execute function public.set_accessrevamp_updated_at();

drop trigger if exists entitlements_accessrevamp_updated_at on public.entitlements;
create trigger entitlements_accessrevamp_updated_at
before update on public.entitlements
for each row execute function public.set_accessrevamp_updated_at();

drop trigger if exists upgrade_reservations_accessrevamp_updated_at on public.upgrade_reservations;
create trigger upgrade_reservations_accessrevamp_updated_at
before update on public.upgrade_reservations
for each row execute function public.set_accessrevamp_updated_at();

alter table public.tier_catalog enable row level security;
alter table public.entitlements enable row level security;
alter table public.upgrade_reservations enable row level security;
alter table public.refund_dependencies enable row level security;

revoke all on table public.tier_catalog, public.entitlements, public.upgrade_reservations, public.refund_dependencies from public, anon, authenticated;
grant all on table public.tier_catalog, public.entitlements, public.upgrade_reservations, public.refund_dependencies to service_role;
grant select on table public.entitlements to authenticated;

drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own
  on public.entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.tier_catalog is
  'Canonical non-subscription AccessRevamp tier definitions. Stripe references are server-only and nullable until guarded test-mode configuration is verified.';
comment on table public.entitlements is
  'Durable highest paid AccessRevamp entitlement per user. Authenticated customers can read only their own rows.';
comment on table public.upgrade_reservations is
  'Server-only, short-lived cumulative-credit reservations. Browser roles have no table privileges.';
comment on table public.refund_dependencies is
  'Server/operator-only record of higher-tier purchases that depended on value later affected by a refund.';
