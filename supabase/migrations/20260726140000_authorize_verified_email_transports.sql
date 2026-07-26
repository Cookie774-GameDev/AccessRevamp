-- Authorize the verified production infrastructure while preserving explicit
-- compliance and human-launch interlocks.

do $$
declare
  v_mailboxes integer;
  v_assignments integer;
begin
  select count(*) into v_mailboxes
  from public.accessrevamp_mailboxes
  where provider = 'icemail_azure'
    and status = 'active'
    and provider_mailbox_id is not null;

  if v_mailboxes <> 100 then
    raise exception 'Expected exactly 100 active Icemail Azure mailboxes with provider IDs; found %.', v_mailboxes
      using errcode = '55000';
  end if;

  select count(*) into v_assignments
  from public.accessrevamp_mailbox_owner_assignments assignments
  join public.accessrevamp_mailboxes mailboxes on mailboxes.id = assignments.mailbox_id
  where mailboxes.provider = 'icemail_azure'
    and mailboxes.status = 'active'
    and mailboxes.provider_mailbox_id is not null;

  if v_assignments <> 100 then
    raise exception 'Expected exactly 100 permanent mailbox assignments; found %.', v_assignments
      using errcode = '55000';
  end if;

  if exists (
    select assignments.owner_code
    from public.accessrevamp_mailbox_owner_assignments assignments
    join public.accessrevamp_mailboxes mailboxes on mailboxes.id = assignments.mailbox_id
    where mailboxes.provider = 'icemail_azure'
      and mailboxes.status = 'active'
      and mailboxes.provider_mailbox_id is not null
    group by assignments.owner_code
    having count(*) <> 20
  ) then
    raise exception 'Every permanent owner must retain exactly 20 mailboxes.'
      using errcode = '55000';
  end if;

  update public.accessrevamp_mailboxes
  set outbound_authorized = true,
      reply_handling_authorized = true,
      last_health_check_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where provider = 'icemail_azure'
    and status = 'active'
    and provider_mailbox_id is not null;

  if not found then
    raise exception 'No verified Icemail Azure mailboxes were authorized.'
      using errcode = '55000';
  end if;
end;
$$;

update public.accessrevamp_agent_settings
set external_email_transport_enabled = true,
    mailbox_warmup_automation_enabled = false,
    updated_at = timezone('utc', now())
where singleton = true;

update public.outreach_settings
set sender_name = 'AccessRevamp',
    sender_email = 'support@accessrevamp.shop',
    site_url = 'https://accessrevamp.com',
    sending_enabled = false,
    updated_at = timezone('utc', now())
where singleton = true;
