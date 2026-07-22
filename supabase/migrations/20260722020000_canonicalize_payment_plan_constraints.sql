-- Remove legacy Quick Fix constraints that would reject the canonical $200 and
-- $250 paid plans even after a valid reserved Stripe Checkout fulfillment.
-- Fail closed if another environment still contains legacy data that requires an
-- explicit business migration rather than silently rewriting customer history.

do $$
begin
  if exists (select 1 from public.orders where plan_key = 'quick_fix')
     or exists (select 1 from public.customer_projects where plan_key = 'quick_fix') then
    raise exception 'Legacy quick_fix records require an explicit data migration before canonical plan constraints can be installed';
  end if;
end;
$$;

alter table public.orders drop constraint if exists orders_check;
alter table public.orders drop constraint if exists orders_plan_key_check;
alter table public.orders drop constraint if exists orders_amount_total_check;

alter table public.orders
  add constraint orders_plan_key_check
  check (plan_key in ('homepage_reveal','complete_revamp','cinematic_scroll'));

alter table public.orders
  add constraint orders_amount_total_check
  check (
    (
      reservation_id is null
      and (
        (plan_key = 'homepage_reveal' and amount_total = 5000)
        or (plan_key = 'complete_revamp' and amount_total = 20000)
        or (plan_key = 'cinematic_scroll' and amount_total = 25000)
      )
    )
    or
    (
      reservation_id is not null
      and checkout_request_id is not null
      and stripe_price_id ~ '^price_[A-Za-z0-9_]+'
      and gross_cents = case plan_key
        when 'homepage_reveal' then 5000
        when 'complete_revamp' then 20000
        when 'cinematic_scroll' then 25000
        else null
      end
      and credit_cents = case
        when plan_key = 'homepage_reveal' then 0
        when plan_key = 'complete_revamp' then any (array[0,5000])
        when plan_key = 'cinematic_scroll' then any (array[0,5000,20000])
        else false
      end
      and net_cents = gross_cents - credit_cents
      and net_cents > 0
      and amount_total = net_cents
    )
  );

alter table public.customer_projects drop constraint if exists customer_projects_plan_key_check;
alter table public.customer_projects
  add constraint customer_projects_plan_key_check
  check (plan_key in ('homepage_reveal','complete_revamp','cinematic_scroll'));

comment on constraint orders_plan_key_check on public.orders is
  'Only the canonical AccessRevamp paid tiers may be persisted.';
comment on constraint orders_amount_total_check on public.orders is
  'Validates canonical full-price orders and reserved cumulative-credit orders. Stripe and reservation verification remain authoritative.';
comment on constraint customer_projects_plan_key_check on public.customer_projects is
  'Customer projects use the canonical Homepage Reveal, Complete Revamp, or Cinematic Scroll tier.';
