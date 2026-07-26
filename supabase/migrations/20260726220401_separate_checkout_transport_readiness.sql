-- Keep broad launch-governance evidence visible without presenting those
-- owner approvals as a Stripe transport outage.
create or replace function public.accessrevamp_checkout_transport_readiness()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_readiness public.production_readiness_settings%rowtype;
  v_blockers text[] := array[]::text[];
begin
  select *
  into v_readiness
  from public.production_readiness_settings
  where singleton = true;

  if not found then
    return jsonb_build_object(
      'ready_for_live_checkout_transport', false,
      'transport_blockers', jsonb_build_array('production_readiness_settings_missing')
    );
  end if;

  if v_readiness.hosting_verified_at is null then
    v_blockers := array_append(v_blockers, 'hosting_not_verified');
  end if;
  if v_readiness.domain_tls_verified_at is null then
    v_blockers := array_append(v_blockers, 'domain_tls_not_verified');
  end if;
  if v_readiness.monitoring_verified_at is null then
    v_blockers := array_append(v_blockers, 'monitoring_not_verified');
  end if;
  if v_readiness.stripe_webhook_endpoint_verified_at is null then
    v_blockers := array_append(v_blockers, 'stripe_webhook_endpoint_not_verified');
  end if;
  if v_readiness.stripe_live_account_verified_at is null then
    v_blockers := array_append(v_blockers, 'stripe_live_account_not_verified');
  end if;
  if v_readiness.business_identity_verified_at is null then
    v_blockers := array_append(v_blockers, 'business_identity_not_verified');
  end if;

  return jsonb_build_object(
    'ready_for_live_checkout_transport', cardinality(v_blockers) = 0,
    'transport_blockers', to_jsonb(v_blockers)
  );
end;
$$;

revoke all on function public.accessrevamp_checkout_transport_readiness()
  from public, anon, authenticated;
grant execute on function public.accessrevamp_checkout_transport_readiness()
  to service_role;

-- Continue to fail closed for payment transport failures. Broader legal,
-- operational, and accessibility approvals remain reported by the full
-- production-readiness contract but no longer masquerade as Stripe downtime.
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
  select *
  into v_payment
  from public.payment_runtime_settings
  where singleton = true;

  if not found or not coalesce(v_payment.checkout_enabled, false) then
    return new;
  end if;

  if v_payment.expected_livemode then
    v_status := public.accessrevamp_checkout_transport_readiness();
    v_ready := coalesce(
      (v_status ->> 'ready_for_live_checkout_transport')::boolean,
      false
    );
  else
    v_status := public.accessrevamp_production_readiness();
    v_ready := coalesce(
      (v_status ->> 'ready_for_sandbox_checkout')::boolean,
      false
    );
  end if;

  if not v_ready then
    update public.payment_runtime_settings
    set checkout_enabled = false,
        refunds_enabled = false,
        maintenance_reason = 'Checkout paused because payment transport readiness is no longer verified.',
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
