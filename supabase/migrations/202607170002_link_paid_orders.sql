-- Link completed Stripe purchases to a customer account when the account
-- already exists or is created after checkout. This keeps the payment webhook
-- idempotent while supporting a pay-first, sign-up-second customer journey.

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
    status
  )
  select
    new.id,
    orders.id,
    case orders.plan_key
      when 'homepage_reveal' then 'Homepage Reveal project'
      when 'quick_fix' then 'Quick Fix project'
    end,
    orders.plan_key,
    'intake_pending'
  from public.orders
  where orders.user_id = new.id
    and orders.status = 'paid'
  on conflict (order_id) do nothing;

  return new;
end;
$$;

-- Backfill any paid purchases that already match a confirmed profile.
update public.orders as orders
   set user_id = profiles.id,
       updated_at = timezone('utc', now())
  from public.profiles as profiles
 where orders.user_id is null
   and orders.customer_email is not null
   and lower(orders.customer_email) = lower(profiles.email)
   and orders.status = 'paid';

insert into public.customer_projects (
  user_id,
  order_id,
  name,
  plan_key,
  status
)
select
  orders.user_id,
  orders.id,
  case orders.plan_key
    when 'homepage_reveal' then 'Homepage Reveal project'
    when 'quick_fix' then 'Quick Fix project'
  end,
  orders.plan_key,
  'intake_pending'
from public.orders
where orders.user_id is not null
  and orders.status = 'paid'
on conflict (order_id) do nothing;

-- Browser clients do not call the contact RPC directly. Keeping it server-only
-- prevents a caller from choosing arbitrary rate-limit keys and bypassing the
-- Netlify function's HMAC-based rate limit.
revoke execute on function public.submit_accessrevamp_contact(
  text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_accessrevamp_contact(
  text, text, text, text, text, text, text
) to service_role;

-- Profiles are readable by their owner, but only the display name is editable
-- from the browser. Email remains controlled by Supabase Auth.
revoke update on table public.profiles from authenticated;
grant update (full_name) on table public.profiles to authenticated;
