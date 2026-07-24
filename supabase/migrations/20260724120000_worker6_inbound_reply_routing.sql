create table if not exists public.inbound_email_messages (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text not null unique,
  gmail_thread_id text,
  sender_email text not null,
  recipient_emails text[] not null default '{}',
  subject text,
  body_text text not null default '',
  received_at timestamptz not null,
  in_reply_to text,
  processing_status text not null default 'recorded'
    check (processing_status in ('recorded','assigned','draft_ready','needs_review','completed','failed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (char_length(body_text) <= 102400),
  check (sender_email = lower(trim(sender_email)))
);

create table if not exists public.inbound_email_assignments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.inbound_email_messages(id) on delete cascade,
  assignment_kind text not null check (assignment_kind in ('support','inbox_owner','human_review')),
  owner_key text,
  state text not null default 'queued' check (state in ('queued','processing','draft_ready','needs_review','completed','failed')),
  context jsonb not null default '{}'::jsonb,
  gmail_draft_id text,
  failure_reason text,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (assignment_kind <> 'inbox_owner' or owner_key is not null)
);

create table if not exists public.inbound_email_worker_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  outcome text not null default 'running' check (outcome in ('running','succeeded','failed')),
  message_count integer not null default 0 check (message_count >= 0),
  inserted_count integer not null default 0 check (inserted_count >= 0),
  draft_count integer not null default 0 check (draft_count >= 0),
  safe_error text
);

create index if not exists inbound_email_messages_received_idx on public.inbound_email_messages (received_at desc);
create index if not exists inbound_email_assignments_owner_state_idx on public.inbound_email_assignments (owner_key, state, created_at);

alter table public.inbound_email_messages enable row level security;
alter table public.inbound_email_assignments enable row level security;
alter table public.inbound_email_worker_runs enable row level security;

revoke all on public.inbound_email_messages, public.inbound_email_assignments, public.inbound_email_worker_runs
  from public, anon, authenticated;
grant all on public.inbound_email_messages, public.inbound_email_assignments, public.inbound_email_worker_runs
  to service_role;

create or replace function public.find_accessrevamp_inbound_matches(
  p_sender_email text,
  p_in_reply_to text default null
)
returns table(owner_key text, thread_id uuid, mailbox_id uuid)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select
    'mailbox:' || t.mailbox_id::text,
    t.id,
    t.mailbox_id
  from public.accessrevamp_message_threads t
  join public.accessrevamp_mailboxes m on m.id = t.mailbox_id
  where t.recipient_email = lower(trim(p_sender_email))
    and t.thread_kind in ('outreach','customer')
    and t.status not in ('suppressed','closed')
    and m.reply_handling_authorized
    and exists (
      select 1
      from public.accessrevamp_messages sent
      where sent.thread_id = t.id
        and sent.direction = 'outbound'
        and sent.status = 'sent'
        and (p_in_reply_to is null or sent.provider_message_id = p_in_reply_to)
    )
  order by t.last_message_at desc nulls last
  limit 2;
$$;

create or replace function public.record_accessrevamp_inbound_email(
  p_gmail_message_id text,
  p_gmail_thread_id text,
  p_sender_email text,
  p_recipient_emails text[],
  p_subject text,
  p_body_text text,
  p_received_at timestamptz,
  p_in_reply_to text,
  p_assignment_kind text,
  p_owner_key text,
  p_context jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_message_id uuid;
  v_assignment_id uuid;
  v_inserted boolean := false;
begin
  if p_assignment_kind not in ('support','inbox_owner','human_review')
    or (p_assignment_kind = 'inbox_owner' and nullif(trim(p_owner_key),'') is null) then
    raise exception 'Invalid inbound assignment.' using errcode = '22023';
  end if;

  insert into public.inbound_email_messages (
    gmail_message_id, gmail_thread_id, sender_email, recipient_emails,
    subject, body_text, received_at, in_reply_to, processing_status
  ) values (
    p_gmail_message_id, p_gmail_thread_id, lower(trim(p_sender_email)),
    coalesce(p_recipient_emails, '{}'), left(p_subject, 998),
    left(coalesce(p_body_text,''), 102400), p_received_at, p_in_reply_to, 'assigned'
  )
  on conflict (gmail_message_id) do nothing
  returning id into v_message_id;

  if v_message_id is not null then
    v_inserted := true;
  else
    select id into v_message_id from public.inbound_email_messages where gmail_message_id = p_gmail_message_id;
  end if;

  insert into public.inbound_email_assignments (message_id, assignment_kind, owner_key, context)
  values (v_message_id, p_assignment_kind, nullif(trim(p_owner_key),''), coalesce(p_context,'{}'::jsonb))
  on conflict (message_id) do nothing
  returning id into v_assignment_id;

  if v_assignment_id is null then
    select id into v_assignment_id from public.inbound_email_assignments where message_id = v_message_id;
  end if;

  return jsonb_build_object('inserted', v_inserted, 'messageId', v_message_id, 'assignmentId', v_assignment_id);
end;
$$;

create or replace function public.claim_accessrevamp_inbound_assignment(
  p_assignment_id uuid,
  p_owner_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_row public.inbound_email_assignments%rowtype;
begin
  update public.inbound_email_assignments
  set state = 'processing', claimed_at = timezone('utc', now()), updated_at = timezone('utc', now())
  where id = p_assignment_id and state = 'queued'
    and (assignment_kind <> 'inbox_owner' or owner_key = p_owner_key)
  returning * into v_row;
  return case when v_row.id is null then jsonb_build_object('claimed',false)
    else jsonb_build_object('claimed',true,'assignmentId',v_row.id) end;
end;
$$;

create or replace function public.complete_accessrevamp_inbound_assignment(
  p_assignment_id uuid,
  p_state text,
  p_gmail_draft_id text default null,
  p_failure_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_message_id uuid;
begin
  if p_state not in ('draft_ready','needs_review','completed','failed') then
    raise exception 'Invalid assignment state.' using errcode = '22023';
  end if;
  update public.inbound_email_assignments
  set state = p_state,
      gmail_draft_id = nullif(trim(p_gmail_draft_id),''),
      failure_reason = nullif(left(p_failure_reason,500),''),
      completed_at = case when p_state in ('completed','failed') then timezone('utc', now()) else completed_at end,
      updated_at = timezone('utc', now())
  where id = p_assignment_id
  returning message_id into v_message_id;
  if v_message_id is null then raise exception 'Assignment not found.' using errcode = 'P0002'; end if;
  update public.inbound_email_messages set processing_status = p_state, updated_at = timezone('utc', now()) where id = v_message_id;
  return jsonb_build_object('ok',true,'assignmentId',p_assignment_id,'state',p_state);
end;
$$;

revoke all on function public.find_accessrevamp_inbound_matches(text,text) from public, anon, authenticated;
revoke all on function public.record_accessrevamp_inbound_email(text,text,text,text[],text,text,timestamptz,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.claim_accessrevamp_inbound_assignment(uuid,text) from public, anon, authenticated;
revoke all on function public.complete_accessrevamp_inbound_assignment(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.find_accessrevamp_inbound_matches(text,text) to service_role;
grant execute on function public.record_accessrevamp_inbound_email(text,text,text,text[],text,text,timestamptz,text,text,text,jsonb) to service_role;
grant execute on function public.claim_accessrevamp_inbound_assignment(uuid,text) to service_role;
grant execute on function public.complete_accessrevamp_inbound_assignment(uuid,text,text,text) to service_role;
