drop function if exists public.find_accessrevamp_inbound_matches(text,text);

create function public.find_accessrevamp_inbound_matches(
  p_sender_email text,
  p_in_reply_to text default null
)
returns table(
  owner_key text,
  thread_id uuid,
  mailbox_id uuid,
  mailbox_address text,
  provider_mailbox_id text
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select
    'owner:' || a.owner_code as owner_key,
    t.id as thread_id,
    t.mailbox_id as mailbox_id,
    m.address as mailbox_address,
    m.provider_mailbox_id
  from public.accessrevamp_message_threads t
  join public.accessrevamp_mailboxes m on m.id = t.mailbox_id
  join public.accessrevamp_mailbox_owner_assignments a on a.mailbox_id = m.id
  where t.recipient_email = lower(trim(p_sender_email))
    and t.thread_kind in ('outreach','customer')
    and t.status not in ('suppressed','closed')
    and m.reply_handling_authorized
    and m.status = 'active'
    and m.provider = 'icemail_azure'
    and m.provider_mailbox_id is not null
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

revoke all on function public.find_accessrevamp_inbound_matches(text,text)
  from public, anon, authenticated;
grant execute on function public.find_accessrevamp_inbound_matches(text,text)
  to service_role;
