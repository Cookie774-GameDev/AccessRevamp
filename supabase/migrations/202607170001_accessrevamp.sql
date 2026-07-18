-- AccessRevamp isolated application schema.
-- Apply only to the Supabase project intended for AccessRevamp.

create extension if not exists pgcrypto;

create or replace function public.set_accessrevamp_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_email_length check (char_length(email) between 3 and 254)
);
create unique index if not exists profiles_email_lower_uidx on public.profiles (lower(email));

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null default '',
  email text not null,
  website_url text,
  message text not null,
  user_agent text,
  status text not null default 'new' check (status in ('new','reviewing','replied','closed','spam')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint contact_name_length check (char_length(first_name) between 1 and 80 and char_length(last_name) <= 80),
  constraint contact_email_length check (char_length(email) between 3 and 254),
  constraint contact_message_length check (char_length(message) between 20 and 4000)
);
create index if not exists contact_submissions_status_created_idx on public.contact_submissions (status, created_at desc);

create table if not exists public.contact_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count between 1 and 100),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_event_id text not null unique,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  customer_email text,
  plan_key text not null check (plan_key in ('homepage_reveal','quick_fix')),
  amount_total integer not null check ((plan_key = 'homepage_reveal' and amount_total = 5000) or (plan_key = 'quick_fix' and amount_total = 19900)),
  currency text not null default 'usd' check (currency = lower(currency) and char_length(currency) = 3),
  status text not null check (status in ('paid','unpaid','no_payment_required','refunded','partially_refunded','disputed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_customer_email_idx on public.orders (lower(customer_email));

create table if not exists public.customer_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid unique references public.orders(id) on delete set null,
  name text not null,
  website_url text,
  plan_key text not null check (plan_key in ('homepage_reveal','quick_fix')),
  status text not null default 'intake_pending' check (status in ('intake_pending','reviewing','concept','implementation','client_review','completed','paused','canceled')),
  scope_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists customer_projects_user_created_idx on public.customer_projects (user_id, created_at desc);

create table if not exists public.stripe_events (
  id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  payload jsonb not null,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  website_url text not null,
  contact_email text not null,
  contact_source_url text not null,
  public_contact_verified_at timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending','reviewing','approved','rejected')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint prospect_email_length check (char_length(contact_email) between 3 and 254),
  constraint prospect_public_urls check (website_url ~* '^https?://' and contact_source_url ~* '^https?://')
);
create unique index if not exists prospects_website_uidx on public.prospects (lower(website_url));

create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  category text not null check (category in ('accessibility','usability','performance','content','seo','security_hygiene','conversion')),
  title text not null,
  summary text not null,
  evidence text not null,
  reference_url text,
  status text not null default 'candidate' check (status in ('candidate','verified','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint verified_finding_has_review check (status <> 'verified' or (reviewed_by is not null and reviewed_at is not null))
);
create index if not exists findings_prospect_status_idx on public.findings (prospect_id, status);

create table if not exists public.outreach_settings (
  singleton boolean primary key default true check (singleton),
  sender_name text,
  sender_email text,
  postal_address text,
  site_url text,
  daily_limit integer not null default 20 check (daily_limit between 1 and 20),
  sending_enabled boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);
insert into public.outreach_settings (singleton, daily_limit, sending_enabled)
values (true, 20, false)
on conflict (singleton) do nothing;

create table if not exists public.suppression_list (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  reason text not null default 'opt_out',
  source text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  constraint suppression_email_length check (char_length(email) between 3 and 254)
);
create unique index if not exists suppression_email_lower_uidx on public.suppression_list (lower(email));

create table if not exists public.outreach_queue (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body_text text not null,
  status text not null default 'draft' check (status in ('draft','approved','queued','scheduled','sent','failed','canceled')),
  human_approved_by text,
  human_approved_at timestamptz,
  scheduled_for timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  opt_out_token text not null default encode(gen_random_bytes(24), 'hex') unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint outreach_subject_length check (char_length(subject) between 8 and 120),
  constraint outreach_body_length check (char_length(body_text) between 80 and 8000),
  constraint outreach_approval_fields check (status = 'draft' or (human_approved_by is not null and human_approved_at is not null))
);
create index if not exists outreach_queue_status_schedule_idx on public.outreach_queue (status, scheduled_for);
create index if not exists outreach_queue_recipient_idx on public.outreach_queue (lower(recipient_email), created_at desc);

create table if not exists public.accessrevamp_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_accessrevamp_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(coalesce(new.email, '')), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email, full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name), updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_changed_accessrevamp on auth.users;
create trigger on_auth_user_changed_accessrevamp
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_accessrevamp_user();

create or replace function public.submit_accessrevamp_contact(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_website_url text,
  p_message text,
  p_rate_key text,
  p_user_agent text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window timestamptz;
  v_count integer;
  v_id uuid;
begin
  if p_rate_key is null or char_length(p_rate_key) < 32 then raise exception 'Invalid rate key'; end if;
  if char_length(trim(p_first_name)) not between 1 and 80 then raise exception 'Invalid first name'; end if;
  if char_length(trim(p_email)) not between 3 and 254 then raise exception 'Invalid email'; end if;
  if char_length(trim(p_message)) not between 20 and 4000 then raise exception 'Invalid message'; end if;
  if p_website_url is not null and p_website_url !~* '^https?://' then raise exception 'Invalid website URL'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_rate_key, 0));
  select window_started_at, request_count into v_window, v_count from public.contact_rate_limits where rate_key = p_rate_key for update;
  if not found or v_window < v_now - interval '1 hour' then
    insert into public.contact_rate_limits (rate_key, window_started_at, request_count, updated_at)
    values (p_rate_key, v_now, 1, v_now)
    on conflict (rate_key) do update set window_started_at = excluded.window_started_at, request_count = 1, updated_at = excluded.updated_at;
  else
    if v_count >= 5 then raise exception 'Rate limit exceeded'; end if;
    update public.contact_rate_limits set request_count = request_count + 1, updated_at = v_now where rate_key = p_rate_key;
  end if;

  insert into public.contact_submissions (first_name, last_name, email, website_url, message, user_agent)
  values (trim(p_first_name), trim(coalesce(p_last_name, '')), lower(trim(p_email)), nullif(trim(coalesce(p_website_url, '')), ''), trim(p_message), left(coalesce(p_user_agent, ''), 500))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.enforce_accessrevamp_outreach()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prospect public.prospects%rowtype;
  v_settings public.outreach_settings%rowtype;
  v_today_count integer;
  v_recent_count integer;
begin
  new.recipient_email := lower(trim(new.recipient_email));
  if new.status = 'draft' then return new; end if;

  select * into v_prospect from public.prospects where id = new.prospect_id;
  if not found then raise exception 'Prospect not found'; end if;
  if v_prospect.review_status <> 'approved' or v_prospect.public_contact_verified_at is null then
    raise exception 'Prospect must be approved and public contact must be verified';
  end if;
  if lower(v_prospect.contact_email) <> new.recipient_email then raise exception 'Recipient must match verified public contact'; end if;
  if exists (select 1 from public.suppression_list where lower(email) = new.recipient_email) then raise exception 'Recipient is suppressed'; end if;
  if not exists (select 1 from public.findings where prospect_id = new.prospect_id and status = 'verified') then
    raise exception 'At least one human-verified finding is required';
  end if;
  if new.human_approved_by is null or new.human_approved_at is null then raise exception 'Human approval is required'; end if;
  if position('unsubscribe' in lower(new.body_text)) = 0 and position('opt out' in lower(new.body_text)) = 0 then
    raise exception 'Message must include an opt-out instruction';
  end if;

  select * into v_settings from public.outreach_settings where singleton = true;
  if v_settings.sender_name is null or v_settings.sender_email is null or v_settings.postal_address is null or v_settings.site_url is null then
    raise exception 'Sender identity, reply email, postal address, and site URL must be configured';
  end if;
  if new.status in ('queued','scheduled','sent') and not v_settings.sending_enabled then raise exception 'Sending is disabled'; end if;

  if new.status in ('queued','scheduled','sent') then
    select count(*) into v_today_count
    from public.outreach_queue
    where id <> new.id
      and status in ('queued','scheduled','sent')
      and (coalesce(scheduled_for, sent_at, created_at) at time zone 'utc')::date = (now() at time zone 'utc')::date;
    if v_today_count >= least(v_settings.daily_limit, 20) then raise exception 'Daily outreach limit of 20 reached'; end if;

    select count(*) into v_recent_count
    from public.outreach_queue
    where id <> new.id
      and lower(recipient_email) = new.recipient_email
      and status in ('scheduled','sent')
      and created_at >= timezone('utc', now()) - interval '30 days';
    if v_recent_count > 0 then raise exception 'Recipient was already contacted in the last 30 days'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_accessrevamp_outreach_trigger on public.outreach_queue;
create trigger enforce_accessrevamp_outreach_trigger
before insert or update on public.outreach_queue
for each row execute function public.enforce_accessrevamp_outreach();

create trigger profiles_accessrevamp_updated_at before update on public.profiles for each row execute function public.set_accessrevamp_updated_at();
create trigger contacts_accessrevamp_updated_at before update on public.contact_submissions for each row execute function public.set_accessrevamp_updated_at();
create trigger orders_accessrevamp_updated_at before update on public.orders for each row execute function public.set_accessrevamp_updated_at();
create trigger projects_accessrevamp_updated_at before update on public.customer_projects for each row execute function public.set_accessrevamp_updated_at();
create trigger prospects_accessrevamp_updated_at before update on public.prospects for each row execute function public.set_accessrevamp_updated_at();
create trigger findings_accessrevamp_updated_at before update on public.findings for each row execute function public.set_accessrevamp_updated_at();
create trigger outreach_accessrevamp_updated_at before update on public.outreach_queue for each row execute function public.set_accessrevamp_updated_at();

alter table public.profiles enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.contact_rate_limits enable row level security;
alter table public.orders enable row level security;
alter table public.customer_projects enable row level security;
alter table public.stripe_events enable row level security;
alter table public.prospects enable row level security;
alter table public.findings enable row level security;
alter table public.outreach_settings enable row level security;
alter table public.suppression_list enable row level security;
alter table public.outreach_queue enable row level security;
alter table public.accessrevamp_audit_log enable row level security;

revoke all on table public.profiles, public.contact_submissions, public.contact_rate_limits, public.orders, public.customer_projects, public.stripe_events, public.prospects, public.findings, public.outreach_settings, public.suppression_list, public.outreach_queue, public.accessrevamp_audit_log from anon, authenticated;
revoke all on function public.submit_accessrevamp_contact(text,text,text,text,text,text,text) from public;

grant usage on schema public to anon, authenticated;
grant execute on function public.submit_accessrevamp_contact(text,text,text,text,text,text,text) to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.orders, public.customer_projects to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy orders_select_own on public.orders for select to authenticated using ((select auth.uid()) = user_id);
create policy projects_select_own on public.customer_projects for select to authenticated using ((select auth.uid()) = user_id);

comment on table public.outreach_queue is 'Draft and approved business outreach. No provider send is implemented in the database.';
comment on function public.enforce_accessrevamp_outreach() is 'Enforces verified public contact, human approval, opt-out text, sender identity, suppression, 30-day spacing, and a hard maximum of 20 queued/scheduled/sent items per UTC day.';
