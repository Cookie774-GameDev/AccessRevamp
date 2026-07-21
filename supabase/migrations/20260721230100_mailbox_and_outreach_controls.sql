-- Mailbox-aware outreach controls. This migration does not add a mail transport,
-- automate warm-up, or manipulate spam classification.

alter table public.outreach_settings
  add column if not exists target_message_words integer not null default 150,
  add column if not exists maximum_message_words integer not null default 175,
  add column if not exists configured_mailbox_count integer not null default 10,
  add column if not exists cold_messages_per_mailbox integer not null default 5,
  add column if not exists warm_messages_per_mailbox integer not null default 5;

alter table public.outreach_settings drop constraint if exists outreach_settings_message_words_check;
alter table public.outreach_settings add constraint outreach_settings_message_words_check
  check (target_message_words between 40 and 175 and maximum_message_words between target_message_words and 175);
alter table public.outreach_settings drop constraint if exists outreach_settings_mailbox_allocation_check;
alter table public.outreach_settings add constraint outreach_settings_mailbox_allocation_check
  check (
    configured_mailbox_count between 1 and 1000
    and cold_messages_per_mailbox between 0 and 20
    and warm_messages_per_mailbox between 0 and 20
  );

create table if not exists public.accessrevamp_mailboxes (
  id uuid primary key default gen_random_uuid(),
  address text not null unique,
  provider text not null default 'icemail_azure' check (provider in ('icemail_azure','microsoft_365','google_workspace','other')),
  domain text not null,
  status text not null default 'pending' check (status in ('pending','warming','active','paused','degraded','disabled')),
  cold_daily_limit smallint not null default 5 check (cold_daily_limit between 0 and 20),
  warm_daily_limit smallint not null default 5 check (warm_daily_limit between 0 and 20),
  provider_managed_warmup boolean not null default true,
  outbound_authorized boolean not null default false,
  reply_handling_authorized boolean not null default false,
  spam_classification_automation_enabled boolean not null default false check (not spam_classification_automation_enabled),
  health_score numeric(5,2) check (health_score is null or health_score between 0 and 100),
  last_health_check_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (address = lower(trim(address)) and position('@' in address) > 1)
);
create index if not exists accessrevamp_mailboxes_status_idx on public.accessrevamp_mailboxes (status, provider);

create table if not exists public.accessrevamp_mailbox_daily_usage (
  mailbox_id uuid not null references public.accessrevamp_mailboxes(id) on delete cascade,
  usage_day date not null,
  cold_sent integer not null default 0 check (cold_sent >= 0),
  warm_sent integer not null default 0 check (warm_sent >= 0),
  replies_sent integer not null default 0 check (replies_sent >= 0),
  inbound_received integer not null default 0 check (inbound_received >= 0),
  bounces integer not null default 0 check (bounces >= 0),
  complaints integer not null default 0 check (complaints >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (mailbox_id, usage_day)
);

create table if not exists public.accessrevamp_message_threads (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete set null,
  customer_project_id uuid references public.customer_projects(id) on delete set null,
  mailbox_id uuid references public.accessrevamp_mailboxes(id) on delete set null,
  recipient_email text not null,
  thread_kind text not null check (thread_kind in ('outreach','customer','support','warmup')),
  status text not null default 'open' check (status in ('open','waiting_human','waiting_customer','suppressed','closed')),
  provider_thread_id text,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (recipient_email = lower(trim(recipient_email)))
);
create index if not exists accessrevamp_message_threads_status_idx on public.accessrevamp_message_threads (status, last_message_at);
create index if not exists accessrevamp_message_threads_project_idx on public.accessrevamp_message_threads (customer_project_id);
create index if not exists accessrevamp_message_threads_prospect_idx on public.accessrevamp_message_threads (prospect_id);
create index if not exists accessrevamp_message_threads_mailbox_idx on public.accessrevamp_message_threads (mailbox_id);

create table if not exists public.accessrevamp_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.accessrevamp_message_threads(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  message_kind text not null check (message_kind in ('cold','warmup','reply','customer_update','support','transactional')),
  provider_message_id text,
  subject text,
  body_text text not null,
  word_count integer generated always as (cardinality(regexp_split_to_array(trim(body_text), E'\\s+'))) stored,
  status text not null default 'draft' check (status in ('draft','human_review','approved','queued','sent','received','failed','suppressed')),
  human_approved_by text,
  human_approved_at timestamptz,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (message_kind <> 'cold' or word_count <= 175),
  check (status not in ('approved','queued','sent') or (human_approved_by is not null and human_approved_at is not null))
);
create unique index if not exists accessrevamp_messages_provider_uidx on public.accessrevamp_messages (provider_message_id) where provider_message_id is not null;
create index if not exists accessrevamp_messages_thread_idx on public.accessrevamp_messages (thread_id, created_at);

create or replace function public.accessrevamp_outreach_word_count(p_text text)
returns integer
language sql
immutable
set search_path = pg_catalog
as $$
  select case when trim(coalesce(p_text,'')) = '' then 0 else cardinality(regexp_split_to_array(trim(p_text), E'\\s+')) end;
$$;

create or replace function public.enforce_accessrevamp_outreach()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_prospect public.prospects%rowtype;
  v_settings public.outreach_settings%rowtype;
  v_today_count integer;
  v_recent_count integer;
  v_daily_cap integer;
  v_effective_day date;
  v_active_mailboxes integer;
  v_mailbox_operating_cap integer;
  v_word_count integer;
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

  v_word_count := public.accessrevamp_outreach_word_count(new.body_text);
  if v_word_count > least(v_settings.maximum_message_words, 175) then
    raise exception 'Outreach message exceeds the % word maximum', least(v_settings.maximum_message_words, 175);
  end if;

  if new.status in ('queued','scheduled','sent') and not v_settings.sending_enabled then raise exception 'Sending is disabled'; end if;

  if new.status in ('queued','scheduled','sent') then
    select count(*) into v_active_mailboxes
    from public.accessrevamp_mailboxes
    where status = 'active' and outbound_authorized;

    v_mailbox_operating_cap := v_active_mailboxes * greatest(v_settings.cold_messages_per_mailbox, 0);
    if v_mailbox_operating_cap <= 0 then raise exception 'No active authorized mailbox capacity'; end if;

    v_daily_cap := least(greatest(v_settings.daily_limit, 1), 1000, v_mailbox_operating_cap);
    v_effective_day := (coalesce(new.scheduled_for, new.sent_at, new.created_at, now()) at time zone 'utc')::date;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('accessrevamp-outreach-' || v_effective_day::text, 0));

    select count(*) into v_today_count
    from public.outreach_queue
    where (new.id is null or id <> new.id)
      and status in ('queued','scheduled','sent')
      and (coalesce(scheduled_for, sent_at, created_at) at time zone 'utc')::date = v_effective_day;
    if v_today_count >= v_daily_cap then raise exception 'Daily outreach operating limit of % reached', v_daily_cap; end if;

    select count(*) into v_recent_count
    from public.outreach_queue
    where (new.id is null or id <> new.id)
      and lower(recipient_email) = new.recipient_email
      and status in ('scheduled','sent')
      and created_at >= timezone('utc', now()) - interval '30 days';
    if v_recent_count > 0 then raise exception 'Recipient was already contacted in the last 30 days'; end if;
  end if;
  return new;
end;
$$;

alter table public.accessrevamp_mailboxes enable row level security;
alter table public.accessrevamp_mailbox_daily_usage enable row level security;
alter table public.accessrevamp_message_threads enable row level security;
alter table public.accessrevamp_messages enable row level security;

revoke all on table public.accessrevamp_mailboxes, public.accessrevamp_mailbox_daily_usage, public.accessrevamp_message_threads, public.accessrevamp_messages from public, anon, authenticated;
grant all on table public.accessrevamp_mailboxes, public.accessrevamp_mailbox_daily_usage, public.accessrevamp_message_threads, public.accessrevamp_messages to service_role;

drop policy if exists accessrevamp_mailboxes_deny_browser on public.accessrevamp_mailboxes;
create policy accessrevamp_mailboxes_deny_browser on public.accessrevamp_mailboxes for all to anon, authenticated using (false) with check (false);
drop policy if exists accessrevamp_mailbox_daily_usage_deny_browser on public.accessrevamp_mailbox_daily_usage;
create policy accessrevamp_mailbox_daily_usage_deny_browser on public.accessrevamp_mailbox_daily_usage for all to anon, authenticated using (false) with check (false);
drop policy if exists accessrevamp_message_threads_deny_browser on public.accessrevamp_message_threads;
create policy accessrevamp_message_threads_deny_browser on public.accessrevamp_message_threads for all to anon, authenticated using (false) with check (false);
drop policy if exists accessrevamp_messages_deny_browser on public.accessrevamp_messages;
create policy accessrevamp_messages_deny_browser on public.accessrevamp_messages for all to anon, authenticated using (false) with check (false);

revoke all on function public.accessrevamp_outreach_word_count(text) from public, anon, authenticated;
grant execute on function public.accessrevamp_outreach_word_count(text) to service_role;
revoke all on function public.enforce_accessrevamp_outreach() from public, anon, authenticated;
grant execute on function public.enforce_accessrevamp_outreach() to service_role;

comment on table public.accessrevamp_mailboxes is 'Mailbox inventory and allocation limits. Credentials are not stored and spam-classification automation is prohibited.';
comment on table public.accessrevamp_messages is 'Human-reviewed message record. This table is not a mail transport.';
