-- Keep paid-order ownership checks inside Postgres so webhook fulfillment and
-- account-confirmation linking share the same authoritative rule.

create or replace function public.link_accessrevamp_paid_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
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

  -- A customer can pay before signing up. The Auth trigger in migration 003
  -- performs the same link after that customer confirms the checkout email.
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
    status
  )
  values (
    v_user_id,
    v_order.id,
    case v_order.plan_key
      when 'homepage_reveal' then 'Homepage Reveal project'
      when 'quick_fix' then 'Quick Fix project'
    end,
    v_order.plan_key,
    'intake_pending'
  )
  on conflict (order_id) do nothing;

  return v_user_id;
end;
$$;

-- This function bypasses RLS only for the signature-verified server webhook.
-- Never expose it to browser roles.
revoke all on function public.link_accessrevamp_paid_order(uuid) from public, anon, authenticated;
grant execute on function public.link_accessrevamp_paid_order(uuid) to service_role;

comment on function public.link_accessrevamp_paid_order(uuid) is
  'Links a paid AccessRevamp order only to a Supabase user with a confirmed matching checkout email; executable only by service_role.';
