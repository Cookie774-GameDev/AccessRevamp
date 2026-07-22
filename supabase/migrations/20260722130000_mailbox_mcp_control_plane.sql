-- Service-role mailbox enrollment for the local AccessRevamp MCP gateway.
-- This migration stores provider identifiers and authorization state only.
-- It does not store mailbox credentials, enable delivery, or add a bulk transport.

alter table public.accessrevamp_mailboxes
  add column if not exists provider_domain_id text,
  add column if not exists provider_mailbox_id text,
  add column if not exists provider_status text,
  add column if not exists graph_user_id text,
  add column if not exists read_authorized boolean not null default false,
  add column if not exists draft_authorized boolean not null default false,
  add column if not exists message_state_write_authorized boolean not null default false,
  add column if not exists inventory_sync_enabled boolean not null default false,
  add column if not exists last_inventory_sync_at timestamptz;

create unique index if not exists accessrevamp_mailboxes_provider_mailbox_uidx
  on public.accessrevamp_mailboxes (provider, provider_mailbox_id)
  where provider_mailbox_id is not null;
create index if not exists accessrevamp_mailboxes_read_access_idx
  on public.accessrevamp_mailboxes (status, read_authorized, draft_authorized);

alter table public.accessrevamp_mailboxes
  drop constraint if exists accessrevamp_mailboxes_draft_authorization_check;
alter table public.accessrevamp_mailboxes
  add constraint accessrevamp_mailboxes_draft_authorization_check
  check (not draft_authorized or (read_authorized and reply_handling_authorized));
alter table public.accessrevamp_mailboxes
  drop constraint if exists accessrevamp_mailboxes_message_state_authorization_check;
alter table public.accessrevamp_mailboxes
  add constraint accessrevamp_mailboxes_message_state_authorization_check
  check (not message_state_write_authorized or read_authorized);

create table if not exists public.accessrevamp_mailbox_sync_state (
  mailbox_id uuid not null references public.accessrevamp_mailboxes(id) on delete cascade,
  folder_key text not null default 'inbox',
  provider_delta_cursor text,
  last_sync_started_at timestamptz,
  last_sync_completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (mailbox_id, folder_key),
  check (char_length(folder_key) between 1 and 120)
);
create index if not exists accessrevamp_mailbox_sync_state_updated_idx
  on public.accessrevamp_mailbox_sync_state (updated_at);

alter table public.accessrevamp_mailbox_sync_state enable row level security;
revoke all on table public.accessrevamp_mailbox_sync_state from public, anon, authenticated;
grant all on table public.accessrevamp_mailbox_sync_state to service_role;

drop policy if exists accessrevamp_mailbox_sync_state_deny_browser
  on public.accessrevamp_mailbox_sync_state;
create policy accessrevamp_mailbox_sync_state_deny_browser
  on public.accessrevamp_mailbox_sync_state
  for all to anon, authenticated using (false) with check (false);

create or replace function public.configure_accessrevamp_mailbox_access(
  p_address text,
  p_read_authorized boolean,
  p_draft_authorized boolean,
  p_message_state_write_authorized boolean,
  p_reply_handling_authorized boolean,
  p_reason text,
  p_actor_id uuid default null
)
returns table (
  mailbox_id uuid,
  address text,
  read_authorized boolean,
  draft_authorized boolean,
  message_state_write_authorized boolean,
  reply_handling_authorized boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_mailbox public.accessrevamp_mailboxes%rowtype;
  v_address text := lower(trim(coalesce(p_address, '')));
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if v_address !~ '^[^@[:space:]]+@[^@[:space:]]+$' then
    raise exception using errcode = '22023', message = 'A valid mailbox address is required';
  end if;
  if char_length(v_reason) < 8 or char_length(v_reason) > 500 then
    raise exception using errcode = '22023', message = 'An authorization reason of 8 to 500 characters is required';
  end if;
  if p_draft_authorized and (not p_read_authorized or not p_reply_handling_authorized) then
    raise exception using errcode = '22023', message = 'Draft access requires read and reply-handling authorization';
  end if;
  if p_message_state_write_authorized and not p_read_authorized then
    raise exception using errcode = '22023', message = 'Message-state access requires read authorization';
  end if;

  select * into v_mailbox
  from public.accessrevamp_mailboxes
  where public.accessrevamp_mailboxes.address = v_address
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Mailbox is not registered';
  end if;
  if (p_read_authorized or p_draft_authorized or p_message_state_write_authorized)
     and v_mailbox.status <> 'active' then
    raise exception using errcode = '22023', message = 'Only an active mailbox can be authorized';
  end if;

  update public.accessrevamp_mailboxes
     set read_authorized = p_read_authorized,
         draft_authorized = p_draft_authorized,
         message_state_write_authorized = p_message_state_write_authorized,
         reply_handling_authorized = p_reply_handling_authorized,
         updated_at = timezone('utc', now())
   where id = v_mailbox.id;

  insert into public.accessrevamp_audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    p_actor_id,
    'mailbox.access_configured',
    'accessrevamp_mailbox',
    v_mailbox.id::text,
    jsonb_build_object(
      'address', v_address,
      'read_authorized', p_read_authorized,
      'draft_authorized', p_draft_authorized,
      'message_state_write_authorized', p_message_state_write_authorized,
      'reply_handling_authorized', p_reply_handling_authorized,
      'reason', v_reason
    )
  );

  return query
  select m.id, m.address, m.read_authorized, m.draft_authorized,
         m.message_state_write_authorized, m.reply_handling_authorized
  from public.accessrevamp_mailboxes m
  where m.id = v_mailbox.id;
end;
$$;

revoke all on function public.configure_accessrevamp_mailbox_access(
  text, boolean, boolean, boolean, boolean, text, uuid
) from public, anon, authenticated;
grant execute on function public.configure_accessrevamp_mailbox_access(
  text, boolean, boolean, boolean, boolean, text, uuid
) to service_role;

comment on column public.accessrevamp_mailboxes.provider_mailbox_id is
  'Provider inventory identifier only. Mailbox credentials are never stored in this table.';
comment on column public.accessrevamp_mailboxes.read_authorized is
  'Explicit operator authorization for the mailbox MCP to read message content.';
comment on column public.accessrevamp_mailboxes.draft_authorized is
  'Explicit operator authorization to create or update drafts; this does not authorize delivery.';
comment on table public.accessrevamp_mailbox_sync_state is
  'Server-only incremental synchronization cursors. Browser roles are denied.';
comment on function public.configure_accessrevamp_mailbox_access(
  text, boolean, boolean, boolean, boolean, text, uuid
) is 'Configures per-mailbox read and draft controls without changing outbound authorization.';
