alter table public.inbound_email_assignments
  add column if not exists outbound_provider_message_id text;

alter table public.accessrevamp_messages
  add column if not exists automation_policy_id text;

do $$
declare
  v_constraint_name text;
begin
  select c.conname into v_constraint_name
  from pg_catalog.pg_constraint c
  where c.conrelid = 'public.accessrevamp_messages'::regclass
    and c.contype = 'c'
    and pg_catalog.pg_get_constraintdef(c.oid) like '%human_approved_by%';

  if v_constraint_name is not null then
    execute format('alter table public.accessrevamp_messages drop constraint %I', v_constraint_name);
  end if;
end;
$$;

alter table public.accessrevamp_messages
  add constraint accessrevamp_messages_send_approval_check
  check (
    status not in ('approved','queued','sent')
    or (
      human_approved_by is not null
      and human_approved_at is not null
    )
    or (
      message_kind = 'reply'
      and automation_policy_id = 'worker6-ordinary-reply-v1'
    )
  );

create or replace function public.reserve_accessrevamp_reply_send(
  p_assignment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_assignment public.inbound_email_assignments%rowtype;
  v_mailbox_id uuid;
  v_usage_day date := (timezone('America/Chicago', now()))::date;
  v_updated integer;
begin
  select * into v_assignment
  from public.inbound_email_assignments
  where id = p_assignment_id
  for update;

  if not found
    or v_assignment.assignment_kind <> 'inbox_owner'
    or v_assignment.state <> 'processing' then
    raise exception 'Reply assignment is not sendable' using errcode = '22023';
  end if;

  v_mailbox_id := nullif(v_assignment.context->'route'->>'mailboxId', '')::uuid;

  if not exists (
    select 1
    from public.accessrevamp_mailboxes m
    join public.accessrevamp_mailbox_owner_assignments a on a.mailbox_id = m.id
    where m.id = v_mailbox_id
      and m.status = 'active'
      and m.reply_handling_authorized
      and m.provider_mailbox_id is not null
      and v_assignment.owner_key = 'owner:' || a.owner_code
  ) then
    raise exception 'Original mailbox is not authorized for reply handling' using errcode = '42501';
  end if;

  insert into public.accessrevamp_mailbox_daily_usage (mailbox_id, usage_day)
  values (v_mailbox_id, v_usage_day)
  on conflict (mailbox_id, usage_day) do nothing;

  update public.accessrevamp_mailbox_daily_usage
     set replies_sent = replies_sent + 1,
         updated_at = timezone('utc', now())
   where mailbox_id = v_mailbox_id
     and usage_day = v_usage_day
     and cold_sent + replies_sent < 5;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Original mailbox has reached its five-message daily cold-or-reply limit'
      using errcode = 'P0001';
  end if;

  return true;
end;
$$;

create or replace function public.record_accessrevamp_sent_reply(
  p_assignment_id uuid,
  p_provider_message_id text,
  p_subject text,
  p_body_text text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_assignment public.inbound_email_assignments%rowtype;
  v_thread_id uuid;
  v_mailbox_id uuid;
begin
  if nullif(trim(p_provider_message_id), '') is null
    or nullif(trim(p_body_text), '') is null then
    raise exception 'Reply delivery evidence is required' using errcode = '22023';
  end if;

  select * into v_assignment
  from public.inbound_email_assignments
  where id = p_assignment_id
  for update;

  if not found
    or v_assignment.assignment_kind <> 'inbox_owner'
    or v_assignment.state <> 'processing' then
    raise exception 'Reply assignment is not recordable' using errcode = '22023';
  end if;

  v_thread_id := nullif(v_assignment.context->'route'->>'threadId', '')::uuid;
  v_mailbox_id := nullif(v_assignment.context->'route'->>'mailboxId', '')::uuid;

  if not exists (
    select 1
    from public.accessrevamp_message_threads t
    join public.accessrevamp_mailbox_owner_assignments a on a.mailbox_id = t.mailbox_id
    where t.id = v_thread_id
      and t.mailbox_id = v_mailbox_id
      and v_assignment.owner_key = 'owner:' || a.owner_code
  ) then
    raise exception 'Reply thread ownership mismatch' using errcode = '42501';
  end if;

  insert into public.accessrevamp_messages (
    thread_id,
    direction,
    message_kind,
    provider_message_id,
    subject,
    body_text,
    status,
    automation_policy_id,
    sent_at
  ) values (
    v_thread_id,
    'outbound',
    'reply',
    trim(p_provider_message_id),
    left(p_subject, 998),
    p_body_text,
    'sent',
    'worker6-ordinary-reply-v1',
    timezone('utc', now())
  )
  on conflict (provider_message_id) where provider_message_id is not null do nothing;

  update public.accessrevamp_message_threads
     set last_message_at = timezone('utc', now()),
         status = 'waiting_customer',
         updated_at = timezone('utc', now())
   where id = v_thread_id;

  return true;
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
      gmail_draft_id = case
        when p_state = 'draft_ready' then nullif(trim(p_gmail_draft_id),'')
        else gmail_draft_id
      end,
      outbound_provider_message_id = case
        when p_state = 'completed' then nullif(trim(p_gmail_draft_id),'')
        else outbound_provider_message_id
      end,
      failure_reason = nullif(left(p_failure_reason,500),''),
      completed_at = case
        when p_state in ('completed','failed') then timezone('utc', now())
        else completed_at
      end,
      updated_at = timezone('utc', now())
  where id = p_assignment_id
  returning message_id into v_message_id;
  if v_message_id is null then raise exception 'Assignment not found.' using errcode = 'P0002'; end if;
  update public.inbound_email_messages
     set processing_status = p_state,
         updated_at = timezone('utc', now())
   where id = v_message_id;
  return jsonb_build_object('ok',true,'assignmentId',p_assignment_id,'state',p_state);
end;
$$;

revoke all on function public.reserve_accessrevamp_reply_send(uuid)
  from public, anon, authenticated;
revoke all on function public.record_accessrevamp_sent_reply(uuid,text,text,text)
  from public, anon, authenticated;
revoke all on function public.complete_accessrevamp_inbound_assignment(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.reserve_accessrevamp_reply_send(uuid)
  to service_role;
grant execute on function public.record_accessrevamp_sent_reply(uuid,text,text,text)
  to service_role;
grant execute on function public.complete_accessrevamp_inbound_assignment(uuid,text,text,text)
  to service_role;
