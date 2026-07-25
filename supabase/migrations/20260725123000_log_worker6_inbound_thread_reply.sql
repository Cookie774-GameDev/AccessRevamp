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
  v_thread_id uuid;
  v_mailbox_id uuid;
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
    select id into v_message_id
    from public.inbound_email_messages
    where gmail_message_id = p_gmail_message_id;
  end if;

  insert into public.inbound_email_assignments (
    message_id, assignment_kind, owner_key, context
  ) values (
    v_message_id, p_assignment_kind, nullif(trim(p_owner_key),''), coalesce(p_context,'{}'::jsonb)
  )
  on conflict (message_id) do nothing
  returning id into v_assignment_id;

  if v_assignment_id is null then
    select id into v_assignment_id
    from public.inbound_email_assignments
    where message_id = v_message_id;
  end if;

  if v_inserted and p_assignment_kind = 'inbox_owner' then
    v_thread_id := nullif(p_context->'route'->>'threadId', '')::uuid;
    v_mailbox_id := nullif(p_context->'route'->>'mailboxId', '')::uuid;

    if not exists (
      select 1
      from public.accessrevamp_message_threads t
      join public.accessrevamp_mailbox_owner_assignments a on a.mailbox_id = t.mailbox_id
      where t.id = v_thread_id
        and t.mailbox_id = v_mailbox_id
        and p_owner_key = 'owner:' || a.owner_code
    ) then
      raise exception 'Inbound reply thread ownership mismatch' using errcode = '42501';
    end if;

    insert into public.accessrevamp_messages (
      thread_id,
      direction,
      message_kind,
      provider_message_id,
      subject,
      body_text,
      status,
      received_at
    ) values (
      v_thread_id,
      'inbound',
      'reply',
      'gmail:' || p_gmail_message_id,
      left(p_subject, 998),
      left(coalesce(p_body_text, ''), 102400),
      'received',
      p_received_at
    )
    on conflict (provider_message_id) where provider_message_id is not null do nothing;

    update public.accessrevamp_message_threads
       set last_message_at = greatest(coalesce(last_message_at, p_received_at), p_received_at),
           status = 'open',
           updated_at = timezone('utc', now())
     where id = v_thread_id;
  end if;

  return jsonb_build_object(
    'inserted', v_inserted,
    'messageId', v_message_id,
    'assignmentId', v_assignment_id
  );
end;
$$;

revoke all on function public.record_accessrevamp_inbound_email(
  text,text,text,text[],text,text,timestamptz,text,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.record_accessrevamp_inbound_email(
  text,text,text,text[],text,text,timestamptz,text,text,text,jsonb
) to service_role;
