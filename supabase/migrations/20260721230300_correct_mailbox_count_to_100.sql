-- Correct the operator-confirmed Icemail Azure mailbox inventory.
-- This changes capacity metadata only. It does not register mailbox addresses,
-- enable transport, automate warm-up, or manipulate spam classification.

alter table public.outreach_settings
  alter column configured_mailbox_count set default 100;

update public.outreach_settings
   set configured_mailbox_count = 100,
       cold_messages_per_mailbox = 5,
       warm_messages_per_mailbox = 5,
       updated_at = timezone('utc', now())
 where singleton = true;

comment on column public.outreach_settings.configured_mailbox_count is
  'Expected mailbox inventory. One hundred inboxes at five cold and five provider-managed warm-up messages each represent 500 cold plus 500 warm-up messages per day. Actual sending remains limited to registered, active, healthy, authorized mailboxes and every other safety gate.';

create or replace function public.accessrevamp_mailbox_capacity()
returns table (
  configured_mailboxes integer,
  registered_mailboxes integer,
  active_authorized_mailboxes integer,
  configured_cold_allocation integer,
  configured_warm_allocation integer,
  configured_total_allocation integer,
  active_cold_capacity integer,
  registered_warm_capacity integer,
  effective_cold_operating_cap integer
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    s.configured_mailbox_count,
    count(m.id)::integer,
    count(m.id) filter (where m.status = 'active' and m.outbound_authorized)::integer,
    (s.configured_mailbox_count * s.cold_messages_per_mailbox)::integer,
    (s.configured_mailbox_count * s.warm_messages_per_mailbox)::integer,
    (s.configured_mailbox_count * (s.cold_messages_per_mailbox + s.warm_messages_per_mailbox))::integer,
    (count(m.id) filter (where m.status = 'active' and m.outbound_authorized) * s.cold_messages_per_mailbox)::integer,
    (count(m.id) filter (where m.provider_managed_warmup and m.status in ('warming','active')) * s.warm_messages_per_mailbox)::integer,
    least(
      greatest(s.daily_limit, 1),
      1000,
      (count(m.id) filter (where m.status = 'active' and m.outbound_authorized) * s.cold_messages_per_mailbox)::integer
    )::integer
  from public.outreach_settings s
  left join public.accessrevamp_mailboxes m on true
  where s.singleton = true
  group by
    s.configured_mailbox_count,
    s.cold_messages_per_mailbox,
    s.warm_messages_per_mailbox,
    s.daily_limit;
$$;

revoke all on function public.accessrevamp_mailbox_capacity() from public, anon, authenticated;
grant execute on function public.accessrevamp_mailbox_capacity() to service_role;

comment on function public.accessrevamp_mailbox_capacity() is
  'Reports configured and actual mailbox capacity. It never authorizes a send.';
