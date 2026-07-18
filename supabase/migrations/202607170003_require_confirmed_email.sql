-- Paid work may be linked only after Supabase has confirmed ownership of the
-- checkout email. This guard remains effective even if an Auth dashboard
-- setting is changed later.

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
  end if;

  return new;
end;
$$;

-- Ensure the linking function runs when confirmation occurs, not only when the
-- auth record is first inserted.
drop trigger if exists on_auth_user_changed_accessrevamp on auth.users;
create trigger on_auth_user_changed_accessrevamp
after insert or update of email, email_confirmed_at, raw_user_meta_data on auth.users
for each row execute function public.handle_accessrevamp_user();

-- Remove any automatic email-match produced by an earlier migration for an
-- account that is still unconfirmed. This touches only orders whose checkout
-- email matches that same auth record.
delete from public.customer_projects as projects
using public.orders as orders, auth.users as users
where projects.order_id = orders.id
  and projects.user_id = users.id
  and orders.user_id = users.id
  and users.email_confirmed_at is null
  and orders.customer_email is not null
  and lower(orders.customer_email) = lower(coalesce(users.email, ''));

update public.orders as orders
   set user_id = null,
       updated_at = timezone('utc', now())
  from auth.users as users
 where orders.user_id = users.id
   and users.email_confirmed_at is null
   and orders.customer_email is not null
   and lower(orders.customer_email) = lower(coalesce(users.email, ''));

-- Backfill only confirmed accounts.
update public.orders as orders
   set user_id = users.id,
       updated_at = timezone('utc', now())
  from auth.users as users
 where orders.user_id is null
   and users.email_confirmed_at is not null
   and orders.customer_email is not null
   and lower(orders.customer_email) = lower(coalesce(users.email, ''))
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
join auth.users on auth.users.id = orders.user_id
where orders.user_id is not null
  and orders.status = 'paid'
  and auth.users.email_confirmed_at is not null
on conflict (order_id) do nothing;
