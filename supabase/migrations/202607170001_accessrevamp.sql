-- AccessRevamp isolated application schema.
-- Every application-owned object is prefixed ar_ or lives in accessrevamp_private.
-- This migration is safe to apply in a Supabase project that contains unrelated apps.

create extension if not exists pgcrypto;

create schema if not exists accessrevamp_private;
revoke all on schema accessrevamp_private from public, anon, authenticated;
grant usage on schema accessrevamp_private to service_role;

create table if not exists public.ar_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_profiles_email_length check (char_length(email) between 3 and 254),
  constraint ar_profiles_display_name_length check (display_name is null or char_length(display_name) <= 100)
);
create unique index if not exists ar_profiles_email_lower_uidx on public.ar_profiles (lower(email));

create table if not exists public.ar_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'reviewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_staff_role_check check (role in ('owner', 'admin', 'reviewer'))
);

create table if not exists public.ar_snapshot_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  company text not null,
  website_url text not null,
  primary_goal text not null,
  notes text,
  status text not null default 'received',
  source text not null default 'website',
  request_fingerprint text not null,
  consent_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_snapshot_email_length check (char_length(email) between 3 and 254),
  constraint ar_snapshot_goal_check check (primary_goal in ('accessibility', 'design', 'conversion', 'quick-fix')),
  constraint ar_snapshot_status_check check (status in ('received', 'qualified', 'reviewing', 'delivered', 'closed', 'declined')),
  constraint ar_snapshot_notes_length check (notes is null or char_length(notes) <= 2000)
);

create table if not exists public.ar_contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  company text,
  website_url text,
  topic text not null default 'general',
  message text not null,
  status text not null default 'new',
  request_fingerprint text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_contact_topic_check check (topic in ('general', 'snapshot', 'billing', 'project', 'accessibility-feedback', 'privacy')),
  constraint ar_contact_status_check check (status in ('new', 'in_progress', 'replied', 'closed', 'spam')),
  constraint ar_contact_message_length check (char_length(message) between 10 and 4000)
);

create table if not exists public.ar_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_email text,
  website_url text,
  offer_code text not null,
  offer_name text not null,
  amount_cents integer not null,
  amount_total_cents integer not null,
  tax_cents integer not null default 0,
  currency text not null default 'usd',
  payment_status text not null default 'unpaid',
  checkout_status text not null default 'open',
  stripe_session_id text not null unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_orders_offer_amount_check check (
    (offer_code = 'homepage_reveal' and amount_cents = 5000) or
    (offer_code = 'quick_fix' and amount_cents = 19900)
  ),
  constraint ar_orders_total_check check (
    amount_total_cents >= amount_cents and tax_cents = amount_total_cents - amount_cents
  ),
  constraint ar_orders_currency_check check (currency = 'usd'),
  constraint ar_orders_payment_status_check check (payment_status in ('unpaid', 'paid', 'no_payment_required')),
  constraint ar_orders_checkout_status_check check (checkout_status in ('open', 'complete', 'expired'))
);

create table if not exists public.ar_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid unique references public.ar_orders(id) on delete set null,
  project_name text not null,
  website_url text not null,
  status text not null default 'intake',
  current_phase text not null default 'intake',
  agreed_scope jsonb not null default '{}'::jsonb,
  customer_notes text,
  internal_notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_projects_status_check check (status in (
    'intake', 'awaiting_access', 'in_progress', 'awaiting_approval', 'deployed',
    'retesting', 'complete', 'paused', 'cancelled'
  )),
  constraint ar_projects_phase_check check (current_phase in (
    'intake', 'review', 'concept', 'implementation', 'quality_assurance',
    'customer_approval', 'deployment', 'retest', 'delivery'
  )),
  constraint ar_projects_notes_length check (
    (customer_notes is null or char_length(customer_notes) <= 4000) and
    (internal_notes is null or char_length(internal_notes) <= 12000)
  )
);

create table if not exists public.ar_prospects (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  website_url text not null unique,
  domain text not null,
  platform text not null default 'unknown',
  public_business_email text not null,
  public_contact_name text,
  contact_source_url text not null,
  country text not null default 'US',
  fit_reason text not null,
  fit_score integer,
  status text not null default 'discovered',
  source text not null,
  human_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_prospects_country_check check (country = 'US'),
  constraint ar_prospects_fit_score_check check (fit_score is null or fit_score between 0 and 100),
  constraint ar_prospects_status_check check (status in (
    'discovered', 'qualified', 'scanned', 'human_reviewed', 'preview_generated',
    'approved_for_outreach', 'contacted', 'replied', 'closed', 'suppressed'
  ))
);

create table if not exists public.ar_findings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.ar_projects(id) on delete cascade,
  prospect_id uuid references public.ar_prospects(id) on delete cascade,
  rule_id text not null,
  url text not null,
  selector text,
  html_excerpt text,
  title text not null,
  description text not null,
  severity text not null,
  confidence text not null,
  review_status text not null default 'pending',
  affected_users text,
  affected_task text,
  wcag_criteria text[] not null default '{}',
  repair_effort text not null default 'medium',
  suggested_fix text,
  evidence_url text,
  retest_status text not null default 'not_tested',
  human_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_findings_parent_check check (project_id is not null or prospect_id is not null),
  constraint ar_findings_severity_check check (severity in ('blocking', 'serious', 'moderate', 'improvement')),
  constraint ar_findings_confidence_check check (confidence in ('verified', 'high_confidence_automated', 'needs_manual_review')),
  constraint ar_findings_review_check check (review_status in ('pending', 'verified', 'rejected', 'needs_context')),
  constraint ar_findings_verified_consistency check (confidence <> 'verified' or review_status = 'verified'),
  constraint ar_findings_effort_check check (repair_effort in ('small', 'medium', 'large')),
  constraint ar_findings_retest_check check (retest_status in ('not_tested', 'passed', 'failed', 'partial', 'not_applicable'))
);

create table if not exists public.ar_previews (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.ar_prospects(id) on delete cascade,
  finding_id uuid references public.ar_findings(id) on delete set null,
  token_hash text not null unique,
  business_name text not null,
  website_url text not null,
  concept jsonb not null,
  finding_summary text not null,
  affected_users text,
  status text not null default 'draft',
  watermark text not null default 'Private AccessRevamp Concept',
  noindex boolean not null default true,
  approved_at timestamptz,
  expires_at timestamptz not null,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_previews_status_check check (status in ('draft', 'approved', 'expired', 'revoked')),
  constraint ar_previews_expiry_check check (expires_at > created_at),
  constraint ar_previews_views_check check (view_count >= 0)
);

create table if not exists public.ar_outreach_messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.ar_prospects(id) on delete cascade,
  preview_id uuid references public.ar_previews(id) on delete set null,
  contact_email text not null,
  subject text not null,
  body_text text not null,
  unsubscribe_url text not null,
  status text not null default 'draft',
  human_approval_required boolean not null default true,
  human_approved_by uuid references auth.users(id) on delete set null,
  human_approved_at timestamptz,
  scheduled_for timestamptz,
  sent_at timestamptz,
  opted_out_at timestamptz,
  provider_message_id text,
  follow_up_count integer not null default 0,
  source text not null,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_outreach_status_check check (status in (
    'draft', 'approved', 'queued', 'sent', 'replied', 'opted_out',
    'suppressed', 'bounced', 'cancelled'
  )),
  constraint ar_outreach_follow_up_check check (follow_up_count between 0 and 1),
  constraint ar_outreach_approval_check check (
    status = 'draft'
    or (human_approved_at is not null and human_approved_by is not null)
    or status in ('opted_out', 'suppressed', 'cancelled')
  ),
  constraint ar_outreach_review_notes_length check (review_notes is null or char_length(review_notes) <= 2000)
);

create table if not exists public.ar_suppression_list (
  id uuid primary key default gen_random_uuid(),
  normalized_email text not null unique,
  email_hash text not null,
  domain text not null,
  scope text not null default 'email',
  reason text not null,
  source text not null,
  created_at timestamptz not null default now(),
  constraint ar_suppression_scope_check check (scope in ('email', 'domain'))
);

create table if not exists public.ar_stripe_events (
  id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  stripe_created_at timestamptz,
  stripe_object_id text,
  status text not null default 'processing',
  payload_summary jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_stripe_events_status_check check (status in ('processing', 'processed', 'ignored', 'failed'))
);

create table if not exists public.ar_rate_limit_buckets (
  key_hash text not null,
  action text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key_hash, action, window_start),
  constraint ar_rate_limit_count_check check (request_count >= 0)
);

create index if not exists ar_snapshot_requests_user_created_idx on public.ar_snapshot_requests(user_id, created_at desc);
create index if not exists ar_snapshot_requests_status_created_idx on public.ar_snapshot_requests(status, created_at desc);
create index if not exists ar_contact_messages_user_idx on public.ar_contact_messages(user_id) where user_id is not null;
create index if not exists ar_contact_messages_status_created_idx on public.ar_contact_messages(status, created_at desc);
create index if not exists ar_orders_user_created_idx on public.ar_orders(user_id, created_at desc);
create index if not exists ar_orders_email_idx on public.ar_orders(lower(customer_email)) where customer_email is not null;
create index if not exists ar_projects_user_updated_idx on public.ar_projects(user_id, updated_at desc);
create index if not exists ar_prospects_status_score_idx on public.ar_prospects(status, fit_score desc nulls last, created_at desc);
create index if not exists ar_prospects_domain_idx on public.ar_prospects(domain);
create index if not exists ar_findings_project_idx on public.ar_findings(project_id, severity, created_at);
create index if not exists ar_findings_prospect_idx on public.ar_findings(prospect_id, review_status, created_at);
create index if not exists ar_previews_prospect_idx on public.ar_previews(prospect_id);
create index if not exists ar_previews_finding_idx on public.ar_previews(finding_id) where finding_id is not null;
create index if not exists ar_previews_expiry_idx on public.ar_previews(status, expires_at);
create index if not exists ar_outreach_status_created_idx on public.ar_outreach_messages(status, created_at desc);
create index if not exists ar_outreach_email_idx on public.ar_outreach_messages(lower(contact_email));
create index if not exists ar_outreach_preview_idx on public.ar_outreach_messages(preview_id) where preview_id is not null;
create index if not exists ar_outreach_approver_idx on public.ar_outreach_messages(human_approved_by) where human_approved_by is not null;
create unique index if not exists ar_outreach_one_initial_per_prospect_idx
  on public.ar_outreach_messages(prospect_id)
  where follow_up_count = 0 and status not in ('cancelled', 'suppressed', 'opted_out');
create unique index if not exists ar_outreach_one_follow_up_per_prospect_idx
  on public.ar_outreach_messages(prospect_id)
  where follow_up_count = 1 and status not in ('cancelled', 'suppressed', 'opted_out');
create index if not exists ar_suppression_domain_idx on public.ar_suppression_list(domain, scope);
create index if not exists ar_rate_limit_expiry_idx on public.ar_rate_limit_buckets(expires_at);

create or replace function accessrevamp_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.ar_enforce_rate_limit(
  p_key_hash text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if char_length(p_key_hash) < 32 or char_length(p_action) not between 1 and 100 then
    raise exception 'invalid rate limit key';
  end if;
  if p_limit not between 1 and 10000 or p_window_seconds not between 1 and 2592000 then
    raise exception 'invalid rate limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.ar_rate_limit_buckets (
    key_hash, action, window_start, request_count, expires_at
  )
  values (
    p_key_hash,
    p_action,
    v_window_start,
    1,
    v_window_start + make_interval(secs => p_window_seconds * 2)
  )
  on conflict (key_hash, action, window_start)
  do update set
    request_count = public.ar_rate_limit_buckets.request_count + 1,
    expires_at = excluded.expires_at,
    updated_at = v_now
  returning request_count into v_count;

  if random() < 0.01 then
    delete from public.ar_rate_limit_buckets where expires_at < v_now;
  end if;

  return v_count <= p_limit;
end;
$$;

create or replace function public.ar_claim_customer_records(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if not exists (
    select 1
    from auth.users
    where id = p_user_id
      and lower(email) = v_email
      and email_confirmed_at is not null
  ) then
    raise exception 'confirmed user/email mismatch';
  end if;

  insert into public.ar_profiles (id, email, display_name)
  select
    u.id,
    lower(u.email),
    nullif(left(coalesce(
      u.raw_user_meta_data ->> 'display_name',
      u.raw_user_meta_data ->> 'full_name',
      ''
    ), 100), '')
  from auth.users u
  where u.id = p_user_id
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.ar_profiles.display_name),
        updated_at = now();

  update public.ar_snapshot_requests
  set user_id = p_user_id
  where user_id is null and lower(email) = v_email;

  update public.ar_contact_messages
  set user_id = p_user_id
  where user_id is null and lower(email) = v_email;

  update public.ar_orders
  set user_id = p_user_id
  where user_id is null
    and lower(customer_email) = v_email
    and payment_status = 'paid';

  insert into public.ar_projects (
    user_id, order_id, project_name, website_url, status, current_phase, agreed_scope
  )
  select
    p_user_id,
    o.id,
    o.offer_name || ' project',
    coalesce(nullif(o.website_url, ''), 'https://intake-required.invalid/'),
    'intake',
    'intake',
    jsonb_build_object('offer_code', o.offer_code, 'source', 'claimed_paid_order')
  from public.ar_orders o
  where o.user_id = p_user_id
    and o.payment_status = 'paid'
    and not exists (select 1 from public.ar_projects p where p.order_id = o.id)
  on conflict (order_id) do nothing;
end;
$$;

create or replace function public.ar_link_paid_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.ar_orders%rowtype;
  v_user_id uuid;
begin
  select * into v_order
  from public.ar_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'AccessRevamp order not found';
  end if;

  if v_order.payment_status <> 'paid' or v_order.customer_email is null then
    return null;
  end if;

  select u.id into v_user_id
  from auth.users u
  where u.email_confirmed_at is not null
    and lower(u.email) = lower(v_order.customer_email)
  order by u.created_at asc
  limit 1;

  if v_user_id is null then
    return null;
  end if;

  if v_order.user_id is not null and v_order.user_id <> v_user_id then
    raise exception 'AccessRevamp order is already linked to another account';
  end if;

  perform public.ar_claim_customer_records(v_user_id, v_order.customer_email);
  return v_user_id;
end;
$$;

create or replace function public.ar_record_preview_view(p_preview_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ar_previews
  set view_count = view_count + 1,
      last_viewed_at = now()
  where id = p_preview_id
    and status = 'approved'
    and expires_at > now();
$$;

create or replace function accessrevamp_private.claim_customer_after_auth_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and new.email is not null then
    perform public.ar_claim_customer_records(new.id, new.email);
  end if;
  return new;
end;
$$;

create or replace function accessrevamp_private.enforce_outreach_guardrails()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text;
  v_daily_approved integer;
begin
  if new.status in ('opted_out', 'suppressed', 'cancelled') then
    if new.status = 'opted_out' and new.opted_out_at is null then
      raise exception 'opted-out outreach requires opted_out_at';
    end if;
    return new;
  end if;

  select p.domain into v_domain
  from public.ar_prospects p
  where p.id = new.prospect_id
    and p.country = 'US'
    and p.human_verified_at is not null
    and lower(p.public_business_email) = lower(new.contact_email);

  if not found then
    raise exception 'outreach requires a human-verified U.S. prospect and the listed public business email';
  end if;

  if exists (
    select 1
    from public.ar_suppression_list s
    where lower(s.normalized_email) = lower(new.contact_email)
       or (s.scope = 'domain' and lower(s.domain) = lower(v_domain))
  ) then
    raise exception 'recipient is suppressed';
  end if;

  if new.follow_up_count = 1 and not exists (
    select 1
    from public.ar_outreach_messages prior
    where prior.prospect_id = new.prospect_id
      and prior.follow_up_count = 0
      and prior.status in ('sent', 'replied')
  ) then
    raise exception 'a follow-up requires one previously sent initial message';
  end if;

  if new.status in ('approved', 'queued', 'sent') then
    if not new.human_approval_required
       or new.human_approved_by is null
       or new.human_approved_at is null then
      raise exception 'human approval is required before outreach can advance';
    end if;

    if not exists (
      select 1
      from public.ar_staff staff
      where staff.user_id = new.human_approved_by
        and staff.active = true
    ) then
      raise exception 'outreach approver must be an active AccessRevamp staff member';
    end if;

    if new.unsubscribe_url !~* '^https://' then
      raise exception 'approved outreach requires an HTTPS unsubscribe URL';
    end if;

    if position('opt out' in lower(new.body_text)) = 0
       and position('unsubscribe' in lower(new.body_text)) = 0 then
      raise exception 'approved outreach must include a clear opt-out instruction';
    end if;

    if not exists (
      select 1
      from public.ar_previews preview
      join public.ar_findings finding on finding.id = preview.finding_id
      where preview.id = new.preview_id
        and preview.prospect_id = new.prospect_id
        and preview.status = 'approved'
        and preview.noindex = true
        and preview.approved_at is not null
        and preview.expires_at > now()
        and finding.prospect_id = new.prospect_id
        and finding.confidence = 'verified'
        and finding.review_status = 'verified'
        and finding.human_reviewed_at is not null
    ) then
      raise exception 'approved outreach requires a live private preview and a verified finding';
    end if;
  end if;

  if new.status = 'approved' then
    if tg_op = 'INSERT' or old.status is distinct from new.status then
      perform pg_advisory_xact_lock(
        hashtextextended(
          'accessrevamp-outreach-approval-' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD'),
          0
        )
      );

      select count(*) into v_daily_approved
      from public.ar_outreach_messages m
      where m.id <> new.id
        and m.human_approved_at >= date_trunc('day', now(), 'UTC');

      if v_daily_approved >= 20 then
        raise exception 'daily outreach approval limit of 20 reached';
      end if;
    end if;
  end if;

  if new.status = 'sent' and new.sent_at is null then
    raise exception 'sent outreach requires sent_at';
  end if;

  return new;
end;
$$;

revoke all on function accessrevamp_private.set_updated_at() from public, anon, authenticated;
revoke all on function accessrevamp_private.claim_customer_after_auth_change() from public, anon, authenticated;
revoke all on function accessrevamp_private.enforce_outreach_guardrails() from public, anon, authenticated;
revoke all on function public.ar_enforce_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.ar_claim_customer_records(uuid, text) from public, anon, authenticated;
revoke all on function public.ar_link_paid_order(uuid) from public, anon, authenticated;
revoke all on function public.ar_record_preview_view(uuid) from public, anon, authenticated;

grant execute on function accessrevamp_private.set_updated_at() to service_role;
grant execute on function accessrevamp_private.claim_customer_after_auth_change() to service_role;
grant execute on function accessrevamp_private.enforce_outreach_guardrails() to service_role;
grant execute on function public.ar_enforce_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.ar_claim_customer_records(uuid, text) to service_role;
grant execute on function public.ar_link_paid_order(uuid) to service_role;
grant execute on function public.ar_record_preview_view(uuid) to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ar_profiles', 'ar_staff', 'ar_snapshot_requests', 'ar_contact_messages', 'ar_orders',
    'ar_projects', 'ar_prospects', 'ar_findings', 'ar_previews', 'ar_outreach_messages',
    'ar_stripe_events', 'ar_rate_limit_buckets'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function accessrevamp_private.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  end loop;
end;
$$;

drop trigger if exists ar_outreach_guardrails on public.ar_outreach_messages;
create trigger ar_outreach_guardrails
before insert or update on public.ar_outreach_messages
for each row execute function accessrevamp_private.enforce_outreach_guardrails();

drop trigger if exists ar_claim_customer_after_auth_change on auth.users;
create trigger ar_claim_customer_after_auth_change
after insert or update of email, email_confirmed_at on auth.users
for each row
when (new.email_confirmed_at is not null and new.email is not null)
execute function accessrevamp_private.claim_customer_after_auth_change();

alter table public.ar_profiles enable row level security;
alter table public.ar_staff enable row level security;
alter table public.ar_snapshot_requests enable row level security;
alter table public.ar_contact_messages enable row level security;
alter table public.ar_orders enable row level security;
alter table public.ar_projects enable row level security;
alter table public.ar_prospects enable row level security;
alter table public.ar_findings enable row level security;
alter table public.ar_previews enable row level security;
alter table public.ar_outreach_messages enable row level security;
alter table public.ar_suppression_list enable row level security;
alter table public.ar_stripe_events enable row level security;
alter table public.ar_rate_limit_buckets enable row level security;

drop policy if exists ar_profiles_select_own on public.ar_profiles;
create policy ar_profiles_select_own on public.ar_profiles
for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists ar_profiles_update_own on public.ar_profiles;
create policy ar_profiles_update_own on public.ar_profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists ar_snapshot_select_own on public.ar_snapshot_requests;
create policy ar_snapshot_select_own on public.ar_snapshot_requests
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists ar_contact_select_own on public.ar_contact_messages;
create policy ar_contact_select_own on public.ar_contact_messages
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists ar_orders_select_own on public.ar_orders;
create policy ar_orders_select_own on public.ar_orders
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists ar_projects_select_own on public.ar_projects;
create policy ar_projects_select_own on public.ar_projects
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists ar_findings_select_own_project on public.ar_findings;
create policy ar_findings_select_own_project on public.ar_findings
for select to authenticated
using (
  project_id is not null and exists (
    select 1
    from public.ar_projects p
    where p.id = ar_findings.project_id
      and p.user_id = (select auth.uid())
  )
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ar_staff', 'ar_prospects', 'ar_previews', 'ar_outreach_messages',
    'ar_suppression_list', 'ar_stripe_events', 'ar_rate_limit_buckets'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_deny_client', table_name);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (false) with check (false)',
      table_name || '_deny_client',
      table_name
    );
  end loop;
end;
$$;

revoke all on table public.ar_profiles from anon, authenticated;
revoke all on table public.ar_staff from anon, authenticated;
revoke all on table public.ar_snapshot_requests from anon, authenticated;
revoke all on table public.ar_contact_messages from anon, authenticated;
revoke all on table public.ar_orders from anon, authenticated;
revoke all on table public.ar_projects from anon, authenticated;
revoke all on table public.ar_prospects from anon, authenticated;
revoke all on table public.ar_findings from anon, authenticated;
revoke all on table public.ar_previews from anon, authenticated;
revoke all on table public.ar_outreach_messages from anon, authenticated;
revoke all on table public.ar_suppression_list from anon, authenticated;
revoke all on table public.ar_stripe_events from anon, authenticated;
revoke all on table public.ar_rate_limit_buckets from anon, authenticated;

grant select on table public.ar_profiles to authenticated;
grant update (display_name) on table public.ar_profiles to authenticated;
grant select on table public.ar_snapshot_requests to authenticated;
grant select on table public.ar_contact_messages to authenticated;
grant select on table public.ar_orders to authenticated;
grant select on table public.ar_projects to authenticated;
grant select on table public.ar_findings to authenticated;

grant all privileges on table
  public.ar_profiles,
  public.ar_staff,
  public.ar_snapshot_requests,
  public.ar_contact_messages,
  public.ar_orders,
  public.ar_projects,
  public.ar_prospects,
  public.ar_findings,
  public.ar_previews,
  public.ar_outreach_messages,
  public.ar_suppression_list,
  public.ar_stripe_events,
  public.ar_rate_limit_buckets
  to service_role;

grant usage on schema public to anon, authenticated, service_role;

create or replace view public.ar_customer_orders_view
with (security_invoker = true)
as
select
  o.id,
  o.user_id,
  o.offer_code as plan_key,
  o.offer_name,
  o.amount_total_cents as amount_total,
  o.currency,
  o.payment_status as status,
  o.created_at
from public.ar_orders o;

create or replace view public.ar_customer_projects_view
with (security_invoker = true)
as
select
  p.id,
  p.user_id,
  p.order_id,
  p.project_name as name,
  p.status,
  coalesce(o.offer_code, p.agreed_scope ->> 'offer_code') as plan_key,
  p.created_at,
  p.updated_at
from public.ar_projects p
left join public.ar_orders o on o.id = p.order_id;

revoke all on public.ar_customer_orders_view from public, anon;
revoke all on public.ar_customer_projects_view from public, anon;
grant select on public.ar_customer_orders_view to authenticated, service_role;
grant select on public.ar_customer_projects_view to authenticated, service_role;

comment on table public.ar_prospects is
  'Public-business prospect records. Service-role only; not exposed to customers.';
comment on table public.ar_outreach_messages is
  'Commercial outreach drafts and status. Sending requires active-staff approval and a separately configured compliant mailbox provider.';
comment on table public.ar_suppression_list is
  'Permanent opt-out records checked before drafting, approval, follow-up, or sending.';
comment on table public.ar_findings is
  'Deterministic findings plus evidence and explicit human-review state. AI is not the source of truth.';
comment on table public.ar_previews is
  'Private, expiring, noindex concept previews. Tokens are stored only as keyed hashes.';
comment on function public.ar_link_paid_order(uuid) is
  'Links a paid AccessRevamp order only to a confirmed Supabase user whose email matches checkout; service-role only.';
