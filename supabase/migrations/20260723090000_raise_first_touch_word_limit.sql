-- Raise the approved first-touch ceiling without changing any sending or
-- delivery behavior. Sending remains disabled and this does not add transport.

alter table public.outreach_settings
  drop constraint if exists outreach_settings_message_words_check;

alter table public.outreach_settings
  add constraint outreach_settings_message_words_check
  check (
    target_message_words between 40 and 200
    and maximum_message_words between target_message_words and 200
  );

alter table public.outreach_settings
  alter column maximum_message_words set default 200;

insert into public.outreach_settings (singleton, maximum_message_words, sending_enabled)
values (true, 200, false)
on conflict (singleton) do update
set maximum_message_words = excluded.maximum_message_words,
    updated_at = timezone('utc', now());

do $$
declare
  v_constraint_name text;
begin
  select c.conname into v_constraint_name
  from pg_catalog.pg_constraint c
  where c.conrelid = 'public.accessrevamp_messages'::regclass
    and c.contype = 'c'
    and pg_catalog.pg_get_constraintdef(c.oid) like '%word_count <= 175%';

  if v_constraint_name is not null then
    execute format(
      'alter table public.accessrevamp_messages drop constraint %I',
      v_constraint_name
    );
  end if;
end;
$$;

alter table public.accessrevamp_messages
  add constraint accessrevamp_messages_cold_word_count_check
  check (message_kind <> 'cold' or word_count <= 200);

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
  if v_word_count > least(v_settings.maximum_message_words, 200) then
    raise exception 'Outreach message exceeds the % word maximum', least(v_settings.maximum_message_words, 200);
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

revoke all on function public.enforce_accessrevamp_outreach() from public, anon, authenticated;
grant execute on function public.enforce_accessrevamp_outreach() to service_role;

comment on function public.enforce_accessrevamp_outreach() is
  'Enforces verified public contact, human approval, opt-out text, sender identity, suppression, 30-day spacing, mailbox-aware daily capacity, disabled-by-default sending, and a hard 200-word outreach ceiling.';
