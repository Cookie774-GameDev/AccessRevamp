-- AccessRevamp payment runtime guardrails and durable order-draft storage.
-- Checkout and refunds remain disabled until a separately verified runtime is activated.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
revoke all on schema net from public, anon, authenticated;
revoke execute on all functions in schema net from public, anon, authenticated;
grant usage on schema net to service_role;
grant execute on all functions in schema net to service_role;

alter function public.prevent_accessrevamp_audit_mutation() set search_path = pg_catalog, public;
alter function public.limit_accessrevamp_prospect_intake() set search_path = pg_catalog, public;

create index if not exists accessrevamp_outreach_queue_approver_idx on public.accessrevamp_outreach_queue (human_message_approved_by);
create index if not exists entitlements_highest_tier_key_idx on public.entitlements (highest_tier_key);
create index if not exists payment_refunds_operator_id_idx on public.payment_refunds (operator_id);
create index if not exists previews_approved_by_idx on public.previews (approved_by);
create index if not exists prospects_human_reviewer_idx on public.prospects (human_reviewer);
create index if not exists refund_requests_operator_id_idx on public.refund_requests (operator_id);
create index if not exists upgrade_reservations_from_tier_key_idx on public.upgrade_reservations (from_tier_key);
create index if not exists upgrade_reservations_to_tier_key_idx on public.upgrade_reservations (to_tier_key);
create unique index if not exists orders_checkout_request_id_unique on public.orders (checkout_request_id) where checkout_request_id is not null;
create unique index if not exists upgrade_reservations_user_request_unique on public.upgrade_reservations (user_id, idempotency_key);
create unique index if not exists upgrade_reservations_one_open_per_user on public.upgrade_reservations (user_id) where status in ('reserved', 'checkout_created');
create unique index if not exists refund_requests_one_open_per_order on public.refund_requests (order_id) where status in ('requested', 'approved', 'processing');
create unique index if not exists payment_refunds_stripe_event_unique on public.payment_refunds (stripe_event_id);

create table if not exists public.payment_runtime_settings (
  singleton boolean primary key default true check (singleton),
  checkout_enabled boolean not null default false,
  refunds_enabled boolean not null default false,
  expected_livemode boolean not null default false,
  require_two_person_refund boolean not null default true,
  maximum_single_refund_cents integer not null default 25000 check (maximum_single_refund_cents between 1 and 25000),
  maintenance_reason text not null default 'Secure payment runtime is not fully configured.',
  live_payment_approved boolean not null default false,
  configuration_verified_at timestamptz,
  last_successful_webhook_at timestamptz,
  last_checkout_created_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);
insert into public.payment_runtime_settings (singleton) values (true) on conflict (singleton) do nothing;
alter table public.payment_runtime_settings enable row level security;
revoke all on public.payment_runtime_settings from anon, authenticated;
grant select, insert, update, delete on public.payment_runtime_settings to service_role;

create table if not exists public.stripe_price_catalog (
  transition_key text primary key,
  from_tier_key text,
  to_tier_key text not null,
  gross_cents integer not null check (gross_cents > 0),
  credit_cents integer not null default 0 check (credit_cents >= 0),
  net_cents integer not null check (net_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  stripe_product_id text not null check (stripe_product_id ~ '^prod_|^accessrevamp_'),
  stripe_price_id text not null unique check (stripe_price_id ~ '^price_[A-Za-z0-9_]+$'),
  livemode boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (from_tier_key is null or from_tier_key in ('homepage_reveal', 'complete_revamp')),
  check (to_tier_key in ('homepage_reveal', 'complete_revamp', 'cinematic_scroll')),
  check (net_cents = gross_cents - credit_cents),
  check (transition_key = coalesce(from_tier_key, 'none') || '->' || to_tier_key)
);
alter table public.stripe_price_catalog enable row level security;
revoke all on public.stripe_price_catalog from anon, authenticated;
grant select, insert, update, delete on public.stripe_price_catalog to service_role;

insert into public.stripe_price_catalog (
  transition_key, from_tier_key, to_tier_key, gross_cents, credit_cents, net_cents,
  stripe_product_id, stripe_price_id, livemode, active
) values
  ('none->homepage_reveal', null, 'homepage_reveal', 5000, 0, 5000, 'accessrevamp_managed_homepage_reveal', 'price_1TvLJ5LzyGRcyGQJBo1KqXId', false, true),
  ('none->complete_revamp', null, 'complete_revamp', 20000, 0, 20000, 'accessrevamp_managed_complete_revamp', 'price_1TvLJBLzyGRcyGQJnPmcJHTS', false, true),
  ('none->cinematic_scroll', null, 'cinematic_scroll', 25000, 0, 25000, 'accessrevamp_managed_cinematic_scroll', 'price_1TvLJKLzyGRcyGQJMqzL9rwQ', false, true),
  ('homepage_reveal->complete_revamp', 'homepage_reveal', 'complete_revamp', 20000, 5000, 15000, 'accessrevamp_managed_complete_revamp', 'price_1TvLJRLzyGRcyGQJIQRBurtP', false, true),
  ('homepage_reveal->cinematic_scroll', 'homepage_reveal', 'cinematic_scroll', 25000, 5000, 20000, 'accessrevamp_managed_cinematic_scroll', 'price_1TvLJXLzyGRcyGQJ1QjeWquE', false, true),
  ('complete_revamp->cinematic_scroll', 'complete_revamp', 'cinematic_scroll', 25000, 20000, 5000, 'accessrevamp_managed_cinematic_scroll', 'price_1TvLJeLzyGRcyGQJd9zWpaIt', false, true)
on conflict (transition_key) do update set
  from_tier_key = excluded.from_tier_key,
  to_tier_key = excluded.to_tier_key,
  gross_cents = excluded.gross_cents,
  credit_cents = excluded.credit_cents,
  net_cents = excluded.net_cents,
  currency = excluded.currency,
  stripe_product_id = excluded.stripe_product_id,
  stripe_price_id = excluded.stripe_price_id,
  livemode = excluded.livemode,
  active = excluded.active,
  updated_at = timezone('utc', now());

update public.tier_catalog set
  stripe_full_price_id = case tier_key
    when 'homepage_reveal' then 'price_1TvLJ5LzyGRcyGQJBo1KqXId'
    when 'complete_revamp' then 'price_1TvLJBLzyGRcyGQJnPmcJHTS'
    when 'cinematic_scroll' then 'price_1TvLJKLzyGRcyGQJMqzL9rwQ'
    else stripe_full_price_id end,
  updated_at = timezone('utc', now())
where tier_key in ('homepage_reveal', 'complete_revamp', 'cinematic_scroll');

create table if not exists public.order_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  plan_key text not null check (plan_key in ('homepage_reveal', 'complete_revamp', 'cinematic_scroll')),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  business_name text not null check (char_length(btrim(business_name)) between 2 and 160),
  website_url text not null check (website_url ~ '^https://[^[:space:]]+$'),
  email text not null check (email ~ '^[^[:space:]@]+@[^[:space:]@]+$'),
  phone text,
  business_niche text not null check (char_length(btrim(business_niche)) between 2 and 160),
  main_goal text not null check (char_length(btrim(main_goal)) between 20 and 4000),
  requested_pages text not null check (char_length(btrim(requested_pages)) between 2 and 4000),
  integrations text not null default '' check (char_length(integrations) <= 4000),
  style_direction text not null check (char_length(btrim(style_direction)) between 2 and 4000),
  content_status text not null check (char_length(content_status) between 2 and 120),
  desired_launch_date date,
  reference_urls text not null default '' check (char_length(reference_urls) <= 5000),
  specific_request text not null default '' check (char_length(specific_request) <= 8000),
  cinematic_direction text not null default '' check (char_length(cinematic_direction) <= 8000),
  status text not null default 'draft' check (status in ('draft', 'checkout_created', 'paid', 'expired', 'canceled')),
  reservation_id uuid unique references public.upgrade_reservations(id) on delete set null,
  checkout_session_id text unique check (checkout_session_id is null or checkout_session_id ~ '^cs_(test|live)_[A-Za-z0-9_]+$'),
  order_id uuid unique references public.orders(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, request_id)
);
create index if not exists order_drafts_user_status_idx on public.order_drafts (user_id, status, updated_at desc);
alter table public.order_drafts enable row level security;
revoke all on public.order_drafts from anon, authenticated;
grant select, insert, update, delete on public.order_drafts to service_role;

create table if not exists public.order_draft_assets (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.order_drafts(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 10 and 500),
  original_filename text not null check (char_length(original_filename) between 1 and 100),
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','application/zip','application/x-zip-compressed')),
  byte_size integer not null check (byte_size between 1 and 8388608),
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists order_draft_assets_draft_idx on public.order_draft_assets (draft_id);
alter table public.order_draft_assets enable row level security;
revoke all on public.order_draft_assets from anon, authenticated;
grant select, insert, update, delete on public.order_draft_assets to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-draft-assets', 'order-draft-assets', false, 8388608,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','application/zip','application/x-zip-compressed']::text[])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.payment_security_incidents (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique check (char_length(dedupe_key) between 8 and 240),
  incident_type text not null check (incident_type in ('unauthorized_refund','catalog_mismatch','unfulfilled_paid_checkout','duplicate_payment_attempt','webhook_failure','configuration_failure')),
  severity text not null default 'critical' check (severity in ('warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'dismissed')),
  order_id uuid references public.orders(id) on delete set null,
  stripe_object_id text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);
create index if not exists payment_security_incidents_open_idx on public.payment_security_incidents (status, severity, last_seen_at desc);
alter table public.payment_security_incidents enable row level security;
revoke all on public.payment_security_incidents from anon, authenticated;
grant select, insert, update, delete on public.payment_security_incidents to service_role;

create table if not exists public.refund_authorizations (
  id uuid primary key default gen_random_uuid(),
  refund_request_id uuid not null unique references public.refund_requests(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  requested_amount_cents integer not null check (requested_amount_cents > 0),
  reason text not null check (char_length(btrim(reason)) between 10 and 2000),
  requested_by uuid not null references public.accessrevamp_operators(user_id) on delete restrict,
  approved_by uuid references public.accessrevamp_operators(user_id) on delete restrict,
  executed_by uuid references public.accessrevamp_operators(user_id) on delete restrict,
  status text not null default 'pending_second_approval' check (status in ('pending_second_approval','approved','executing','executed','rejected','canceled','expired','failed')),
  execution_idempotency_key uuid unique,
  stripe_refund_id text unique check (stripe_refund_id is null or stripe_refund_id ~ '^re_[A-Za-z0-9_]+$'),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '24 hours'),
  approved_at timestamptz,
  execution_started_at timestamptz,
  executed_at timestamptz,
  failure_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (approved_by is null or approved_by <> requested_by),
  check (executed_by is null or approved_by is not null)
);
create unique index if not exists refund_authorizations_one_active_per_order on public.refund_authorizations (order_id) where status in ('pending_second_approval','approved','executing');
create index if not exists refund_authorizations_status_idx on public.refund_authorizations (status, expires_at);
alter table public.refund_authorizations enable row level security;
revoke all on public.refund_authorizations from anon, authenticated;
grant select, insert, update, delete on public.refund_authorizations to service_role;

alter table public.payment_refunds
  add column if not exists authorization_id uuid references public.refund_authorizations(id) on delete set null,
  add column if not exists authorized boolean not null default false,
  add column if not exists origin text not null default 'provider_event' check (origin in ('provider_event','operator_approved','dashboard_manual','unknown'));
create index if not exists payment_refunds_authorization_idx on public.payment_refunds (authorization_id);
