-- Add the $250 Cinematic Scroll Site, delivery tracking, and customer refund
-- requests. All browser-visible data remains protected by RLS and explicit
-- grants. Refund execution itself stays in Stripe and is an operator action.

alter table public.orders drop constraint if exists orders_plan_key_check;
alter table public.orders
  add constraint orders_plan_key_check
  check (plan_key in ('homepage_reveal', 'quick_fix', 'cinematic_scroll'));

alter table public.orders drop constraint if exists orders_amount_total_check;
alter table public.orders
  add constraint orders_amount_total_check
  check (
    (plan_key = 'homepage_reveal' and amount_total = 5000)
    or (plan_key = 'quick_fix' and amount_total = 19900)
    or (plan_key = 'cinematic_scroll' and amount_total = 25000)
  );

alter table public.customer_projects drop constraint if exists customer_projects_plan_key_check;
alter table public.customer_projects
  add constraint customer_projects_plan_key_check
  check (plan_key in ('homepage_reveal', 'quick_fix', 'cinematic_scroll'));

alter table public.customer_projects
  add column if not exists required_inputs_received_at timestamptz,
  add column if not exists delivery_due_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivery_status text not null default 'waiting_for_inputs';

alter table public.customer_projects drop constraint if exists customer_projects_delivery_status_check;
alter table public.customer_projects
  add constraint customer_projects_delivery_status_check
  check (delivery_status in (
    'waiting_for_inputs',
    'scheduled',
    'in_progress',
    'ready_for_delivery',
    'delivered',
    'paused',
    'canceled'
  ));

alter table public.customer_projects drop constraint if exists customer_projects_delivery_fields_check;
alter table public.customer_projects
  add constraint customer_projects_delivery_fields_check
  check (
    (delivery_status <> 'delivered' and delivered_at is null)
    or (delivery_status = 'delivered' and delivered_at is not null)
  );

create index if not exists customer_projects_delivery_due_idx
  on public.customer_projects (delivery_status, delivery_due_at)
  where delivery_status not in ('delivered', 'canceled');

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'requested' check (status in (
    'requested',
    'approved',
    'declined',
    'processing',
    'refunded',
    'canceled'
  )),
  stripe_refund_id text,
  requested_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint refund_requests_reason_length check (char_length(trim(reason)) between 10 and 2000),
  constraint refund_requests_resolution_fields_check check (
    (status in ('requested', 'processing') and resolved_at is null)
    or (status in ('approved', 'declined', 'refunded', 'canceled') and resolved_at is not null)
  ),
  constraint refund_requests_stripe_refund_check check (
    status <> 'refunded' or stripe_refund_id is not null
  )
);

create unique index if not exists refund_requests_one_open_per_order_uidx
  on public.refund_requests (order_id)
  where status in ('requested', 'approved', 'processing');

create index if not exists refund_requests_user_requested_idx
  on public.refund_requests (user_id, requested_at desc);

create or replace function public.enforce_accessrevamp_refund_request()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  new.reason := trim(new.reason);

  if tg_op = 'INSERT' then
    select *
      into v_order
      from public.orders
     where id = new.order_id;

    if not found then
      raise exception 'AccessRevamp order not found';
    end if;

    if v_order.user_id is null or v_order.user_id <> new.user_id then
      raise exception 'Refund request must belong to the signed-in order owner';
    end if;

    if v_order.status <> 'paid' then
      raise exception 'Only a paid AccessRevamp order can be refunded';
    end if;

    if exists (
      select 1
        from public.customer_projects as projects
       where projects.order_id = new.order_id
         and (projects.delivered_at is not null or projects.status = 'completed')
    ) then
      raise exception 'The self-service pre-delivery refund window has closed';
    end if;

    new.status := 'requested';
    new.stripe_refund_id := null;
    new.resolved_at := null;
    new.resolution_note := null;
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.enforce_accessrevamp_refund_request() from public, anon, authenticated;
grant execute on function public.enforce_accessrevamp_refund_request() to service_role;

drop trigger if exists enforce_accessrevamp_refund_request_trigger on public.refund_requests;
create trigger enforce_accessrevamp_refund_request_trigger
before insert or update on public.refund_requests
for each row execute function public.enforce_accessrevamp_refund_request();

alter table public.refund_requests enable row level security;

revoke all on table public.refund_requests from public, anon, authenticated;
grant all on table public.refund_requests to service_role;
grant select, insert on table public.refund_requests to authenticated;

create policy refund_requests_select_own
  on public.refund_requests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy refund_requests_insert_own_before_delivery
  on public.refund_requests
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and status = 'requested'
    and exists (
      select 1
        from public.orders
       where orders.id = refund_requests.order_id
         and orders.user_id = (select auth.uid())
         and orders.status = 'paid'
    )
    and not exists (
      select 1
        from public.customer_projects as projects
       where projects.order_id = refund_requests.order_id
         and (projects.delivered_at is not null or projects.status = 'completed')
    )
  );

-- Paid work may be linked only after Supabase has confirmed ownership of the
-- checkout email. This replaces the prior function only to add the new plan.
create or replace function public.handle_accessrevamp_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        updated_at = timezone('utc', now());

  if new.email_confirmed_at is not null then
    update public.orders
       set user_id = new.id,
           updated_at = timezone('utc', now())
     where user_id is null
       and customer_email is not null
       and lower(customer_email) = lower(coalesce(new.email, ''))
       and status = 'paid';

    insert into public.customer_projects (
      user_id,
      order_id,
      name,
      plan_key,
      status,
      delivery_status
    )
    select
      new.id,
      orders.id,
      case orders.plan_key
        when 'homepage_reveal' then 'Homepage Reveal project'
        when 'quick_fix' then 'Quick Fix project'
        when 'cinematic_scroll' then 'Cinematic Scroll Site project'
      end,
      orders.plan_key,
      'intake_pending',
      'waiting_for_inputs'
    from public.orders
    where orders.user_id = new.id
      and orders.status = 'paid'
    on conflict (order_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_accessrevamp_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_changed_accessrevamp on auth.users;
create trigger on_auth_user_changed_accessrevamp
after insert or update of email, email_confirmed_at, raw_user_meta_data on auth.users
for each row execute function public.handle_accessrevamp_user();

create or replace function public.link_accessrevamp_paid_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_order public.orders%rowtype;
  v_user_id uuid;
begin
  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'AccessRevamp order not found';
  end if;

  if v_order.status <> 'paid' or v_order.customer_email is null then
    return null;
  end if;

  select users.id
    into v_user_id
    from auth.users as users
   where users.email_confirmed_at is not null
     and lower(users.email) = lower(v_order.customer_email)
   limit 1;

  if v_user_id is null then
    return null;
  end if;

  if v_order.user_id is not null and v_order.user_id <> v_user_id then
    raise exception 'AccessRevamp order is already linked to another account';
  end if;

  update public.orders
     set user_id = v_user_id,
         updated_at = timezone('utc', now())
   where id = v_order.id;

  insert into public.customer_projects (
    user_id,
    order_id,
    name,
    plan_key,
    status,
    delivery_status
  )
  values (
    v_user_id,
    v_order.id,
    case v_order.plan_key
      when 'homepage_reveal' then 'Homepage Reveal project'
      when 'quick_fix' then 'Quick Fix project'
      when 'cinematic_scroll' then 'Cinematic Scroll Site project'
    end,
    v_order.plan_key,
    'intake_pending',
    'waiting_for_inputs'
  )
  on conflict (order_id) do nothing;

  return v_user_id;
end;
$$;

revoke all on function public.link_accessrevamp_paid_order(uuid) from public, anon, authenticated;
grant execute on function public.link_accessrevamp_paid_order(uuid) to service_role;

comment on table public.refund_requests is
  'Customer refund requests. Authenticated customers may request a refund only for their own paid order before final digital delivery; Stripe execution is service-role/operator controlled.';
comment on column public.customer_projects.delivery_due_at is
  'Written delivery deadline. Homepage Reveal and Cinematic Scroll Site target three business days after payment and complete intake; Quick Fix implementation timing remains scope-dependent.';
