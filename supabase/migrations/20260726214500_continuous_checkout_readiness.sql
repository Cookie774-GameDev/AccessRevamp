-- Fail closed when verified production-readiness evidence is later revoked.
create or replace function public.fail_close_accessrevamp_checkout_on_readiness_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_payment public.payment_runtime_settings%rowtype;
  v_status jsonb;
  v_ready boolean;
begin
  select * into v_payment
  from public.payment_runtime_settings
  where singleton = true;

  if not found or not coalesce(v_payment.checkout_enabled, false) then
    return new;
  end if;

  v_status := public.accessrevamp_production_readiness();
  v_ready := case
    when v_payment.expected_livemode
      then coalesce((v_status ->> 'ready_for_live_checkout')::boolean, false)
    else coalesce((v_status ->> 'ready_for_sandbox_checkout')::boolean, false)
  end;

  if not v_ready then
    update public.payment_runtime_settings
    set checkout_enabled = false,
        refunds_enabled = false,
        maintenance_reason = 'Checkout paused because production readiness is no longer verified.',
        updated_at = timezone('utc', now())
    where singleton = true
      and (checkout_enabled or refunds_enabled);
  end if;

  return new;
end;
$$;

revoke all on function public.fail_close_accessrevamp_checkout_on_readiness_change()
  from public, anon, authenticated;
grant execute on function public.fail_close_accessrevamp_checkout_on_readiness_change()
  to service_role;

drop trigger if exists fail_close_accessrevamp_checkout_on_readiness_change_trigger
  on public.production_readiness_settings;
create trigger fail_close_accessrevamp_checkout_on_readiness_change_trigger
after insert or update on public.production_readiness_settings
for each row execute function public.fail_close_accessrevamp_checkout_on_readiness_change();
