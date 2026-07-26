-- Activation uses the same narrow transport contract as the runtime. Sandbox
-- activation still requires the full sandbox readiness contract.
create or replace function public.guard_accessrevamp_payment_activation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_status jsonb;
  v_ready boolean;
  v_active_operators integer;
begin
  if new.expected_livemode then
    v_status := public.accessrevamp_checkout_transport_readiness();
  else
    v_status := public.accessrevamp_production_readiness();
  end if;

  if new.live_payment_approved and not new.expected_livemode then
    raise exception using errcode = '55000',
      message = 'Live payment approval requires live payment mode';
  end if;

  if new.checkout_enabled then
    v_ready := case
      when new.expected_livemode then coalesce((v_status ->> 'ready_for_live_checkout_transport')::boolean, false)
      else coalesce((v_status ->> 'ready_for_sandbox_checkout')::boolean, false)
    end;
    if not v_ready then
      raise exception using errcode = '55000',
        message = 'Checkout cannot be enabled until payment transport readiness is verified';
    end if;
    if new.configuration_verified_at is null
       or new.configuration_verified_at < timezone('utc', now()) - interval '24 hours' then
      raise exception using errcode = '55000',
        message = 'Checkout configuration must be verified within the last 24 hours';
    end if;
    if new.expected_livemode and not new.live_payment_approved then
      raise exception using errcode = '55000',
        message = 'Live checkout requires explicit live payment approval';
    end if;
  end if;

  if new.refunds_enabled then
    if not new.checkout_enabled then
      raise exception using errcode = '55000',
        message = 'Refund execution cannot be enabled while checkout is disabled';
    end if;
    select count(*)
    into v_active_operators
    from public.accessrevamp_operators
    where active;
    if new.require_two_person_refund and v_active_operators < 2 then
      raise exception using errcode = '55000',
        message = 'Two active operators are required for two-person refund control';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_accessrevamp_payment_activation()
  from public, anon, authenticated;
grant execute on function public.guard_accessrevamp_payment_activation()
  to service_role;
