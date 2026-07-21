-- Raise the configurable daily outreach ceiling while preserving every existing
-- provenance, human-approval, suppression, opt-out, spacing, and kill-switch gate.
-- This does not enable sending or add a mail transport.

alter table public.outreach_settings
  drop constraint if exists outreach_settings_daily_limit_check;

alter table public.outreach_settings
  add constraint outreach_settings_daily_limit_check
  check (daily_limit between 1 and 1000);

alter table public.outreach_settings
  alter column daily_limit set default 1000;

insert into public.outreach_settings (singleton, daily_limit, sending_enabled)
values (true, 1000, false)
on conflict (singleton) do update
set daily_limit = excluded.daily_limit,
    updated_at = timezone('utc', now());

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
begin
  new.recipient_email := lower(trim(new.recipient_email));
  if new.status = 'draft' then return new; end if;

  select * into v_prospect
  from public.prospects
  where id = new.prospect_id;

  if not found then raise exception 'Prospect not found'; end if;
  if v_prospect.review_status <> 'approved' or v_prospect.public_contact_verified_at is null then
    raise exception 'Prospect must be approved and public contact must be verified';
  end if;
  if lower(v_prospect.contact_email) <> new.recipient_email then
    raise exception 'Recipient must match verified public contact';
  end if;
  if exists (select 1 from public.suppression_list where lower(email) = new.recipient_email) then
    raise exception 'Recipient is suppressed';
  end if;
  if not exists (select 1 from public.findings where prospect_id = new.prospect_id and status = 'verified') then
    raise exception 'At least one human-verified finding is required';
  end if;
  if new.human_approved_by is null or new.human_approved_at is null then
    raise exception 'Human approval is required';
  end if;
  if position('unsubscribe' in lower(new.body_text)) = 0
     and position('opt out' in lower(new.body_text)) = 0 then
    raise exception 'Message must include an opt-out instruction';
  end if;

  select * into v_settings
  from public.outreach_settings
  where singleton = true;

  if v_settings.sender_name is null
     or v_settings.sender_email is null
     or v_settings.postal_address is null
     or v_settings.site_url is null then
    raise exception 'Sender identity, reply email, postal address, and site URL must be configured';
  end if;

  if new.status in ('queued','scheduled','sent') and not v_settings.sending_enabled then
    raise exception 'Sending is disabled';
  end if;

  if new.status in ('queued','scheduled','sent') then
    v_daily_cap := least(greatest(v_settings.daily_limit, 1), 1000);
    v_effective_day := (coalesce(new.scheduled_for, new.sent_at, new.created_at, now()) at time zone 'utc')::date;

    -- Serialize same-day queue transitions so concurrent workers cannot race past
    -- the configured ceiling.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('accessrevamp-outreach-' || v_effective_day::text, 0)
    );

    select count(*) into v_today_count
    from public.outreach_queue
    where (new.id is null or id <> new.id)
      and status in ('queued','scheduled','sent')
      and (coalesce(scheduled_for, sent_at, created_at) at time zone 'utc')::date = v_effective_day;

    if v_today_count >= v_daily_cap then
      raise exception 'Daily outreach limit of % reached', v_daily_cap;
    end if;

    select count(*) into v_recent_count
    from public.outreach_queue
    where (new.id is null or id <> new.id)
      and lower(recipient_email) = new.recipient_email
      and status in ('scheduled','sent')
      and created_at >= timezone('utc', now()) - interval '30 days';

    if v_recent_count > 0 then
      raise exception 'Recipient was already contacted in the last 30 days';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_accessrevamp_outreach() from public, anon, authenticated;
grant execute on function public.enforce_accessrevamp_outreach() to service_role;

comment on function public.enforce_accessrevamp_outreach() is
  'Enforces verified public contact, human approval, opt-out text, sender identity, suppression, 30-day spacing, a concurrency-safe configurable ceiling, and a hard maximum of 1000 queued/scheduled/sent items per UTC day.';
