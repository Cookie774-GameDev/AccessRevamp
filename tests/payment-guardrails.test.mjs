import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkoutProductionReadiness } from '../netlify/functions/_shared/payment-runtime.mjs';

const read = (path) => readFile(path, 'utf8');

test('live checkout uses the technical transport gate without erasing broader launch blockers', async () => {
  const admin = {
    rpc: async (name) => {
      assert.equal(name, 'accessrevamp_checkout_transport_readiness');
      return {
        data: {
          ready_for_live_checkout_transport: true,
          transport_blockers: [],
        },
        error: null,
      };
    },
  };

  assert.deepEqual(await checkoutProductionReadiness(admin, true), {
    ready: true,
    gate: 'ready_for_live_checkout_transport',
  });
});

test('payment runtime remains fail closed until a verified catalog and configuration are present', async () => {
  const [core, functions, monitoring, runtime, health, continuous, transport, activation] = await Promise.all([
    read('supabase/migrations/20260720170000_payment_runtime_guardrails.sql'),
    read('supabase/migrations/20260720170100_payment_runtime_functions.sql'),
    read('supabase/migrations/20260720170200_payment_runtime_monitoring.sql'),
    read('netlify/functions/_shared/payment-runtime.mjs'),
    read('netlify/functions/payment-health.mjs'),
    read('supabase/migrations/20260726214500_continuous_checkout_readiness.sql'),
    read('supabase/migrations/20260726220401_separate_checkout_transport_readiness.sql'),
    read('supabase/migrations/20260726221249_separate_checkout_activation_guard.sql'),
  ]);
  assert.match(core, /checkout_enabled boolean not null default false/);
  assert.match(core, /refunds_enabled boolean not null default false/);
  assert.match(core, /require_two_person_refund boolean not null default true/);
  assert.match(core, /upgrade_reservations_one_open_per_user/);
  assert.match(core, /orders_checkout_request_id_unique/);
  assert.match(core, /payment_security_incidents/);
  assert.match(functions, /configuration_verified_at.*24 hours/s);
  assert.match(functions, /At least two active operators are required/);
  assert.match(functions, /guard_accessrevamp_checkout_reservation/);
  assert.match(monitoring, /accessrevamp-payment-anomaly-scan/);
  assert.match(monitoring, /unfulfilled_paid_checkout/);
  assert.match(runtime, /Secure checkout is temporarily paused/);
  assert.match(runtime, /stripe_price_catalog/);
  assert.match(runtime, /accessrevamp_production_readiness/);
  assert.match(runtime, /ready_for_live_checkout/);
  assert.match(health, /checkoutProductionReadiness/);
  assert.match(health, /productionReadiness\.ready/);
  assert.match(continuous, /fail_close_accessrevamp_checkout_on_readiness_change/);
  assert.match(continuous, /checkout_enabled = false/);
  assert.match(continuous, /refunds_enabled = false/);
  assert.match(transport, /accessrevamp_checkout_transport_readiness/);
  assert.match(transport, /ready_for_live_checkout_transport/);
  assert.match(transport, /fail_close_accessrevamp_checkout_on_readiness_change/);
  assert.match(activation, /guard_accessrevamp_payment_activation/);
  assert.match(
    activation,
    /when new\.expected_livemode then coalesce\(\(v_status ->> 'ready_for_live_checkout_transport'\)::boolean, false\)/,
  );
});

test('checkout saves a confirmed order draft before creating one idempotent Stripe session', async () => {
  const [client, persistedClient, draft, checkout, component, reservationRpc, expiryFix] = await Promise.all([
    read('src/services/checkout.js'),
    read('src/services/persisted-checkout.js'),
    read('netlify/functions/order-draft.mjs'),
    read('netlify/functions/create-checkout.mjs'),
    read('src/components/order-wizard.js'),
    read('supabase/migrations/202607180003_add_payment_rpcs.sql'),
    read('supabase/migrations/20260726222501_qualify_reservation_expiry.sql'),
  ]);
  assert.match(persistedClient, /ORDER_DRAFT_ENDPOINT/);
  assert.ok(persistedClient.indexOf('fetchImpl(ORDER_DRAFT_ENDPOINT') < persistedClient.indexOf('fetchImpl(CHECKOUT_ENDPOINT'));
  assert.match(persistedClient, /Your project request was not saved — no payment started/);
  assert.match(draft, /save_accessrevamp_order_draft/);
  assert.match(draft, /order-draft-assets/);
  assert.match(draft, /terms_version: CURRENT_POLICY_VERSION/);
  assert.match(draft, /privacy_version: CURRENT_POLICY_VERSION/);
  assert.match(reservationRpc, /public\.upgrade_reservations\.expires_at <= v_now/);
  assert.match(expiryFix, /pg_get_functiondef/);
  assert.match(expiryFix, /public\.upgrade_reservations\.expires_at <= v_now/);
  assert.match(draft, /requireConfirmedUser/);
  assert.match(checkout, /\.from\('order_drafts'\)/);
  assert.match(checkout, /STRIPE_CHECKOUT_SECRET_KEY/);
  assert.match(checkout, /resolveCatalogPrice/);
  assert.match(checkout, /idempotencyKey: `accessrevamp_checkout_/);
  assert.match(checkout, /consent_collection:\s*\{\s*terms_of_service:\s*'required'\s*\}/);
  assert.doesNotMatch(checkout, /book\.stripe\.com|payment[_-]?link/i);
  assert.match(component, /name="referenceFiles"/);
});

test('webhook fulfillment is signature verified, mode locked and database authoritative', async () => {
  const webhook = await read('netlify/functions/stripe-webhook.mjs');
  assert.match(webhook, /constructEventAsync/);
  assert.match(webhook, /STRIPE_WEBHOOK_READ_SECRET_KEY/);
  assert.match(webhook, /resolveCatalogPrice/);
  assert.match(webhook, /fulfill_accessrevamp_checkout/);
  assert.match(webhook, /close_accessrevamp_checkout/);
  assert.match(webhook, /recordPaymentIncident/);
  assert.match(webhook, /record_accessrevamp_webhook_outcome/);
  assert.match(webhook, /reconcile_accessrevamp_dispute/);
});

test('refunds require one request, a distinct approver and an idempotent restricted executor', async () => {
  const [core, functions, authorization, execution, env] = await Promise.all([
    read('supabase/migrations/20260720170000_payment_runtime_guardrails.sql'),
    read('supabase/migrations/20260720170100_payment_runtime_functions.sql'),
    read('netlify/functions/refund-authorization.mjs'),
    read('netlify/functions/refund-execute.mjs'),
    read('.env.example'),
  ]);
  assert.match(core, /approved_by is null or approved_by <> requested_by/);
  assert.match(core, /refund_authorizations_one_active_per_order/);
  assert.match(functions, /A second distinct operator must approve the refund/);
  assert.match(functions, /Final digital delivery blocks automated refund execution/);
  assert.match(functions, /pause_on_unauthorized_accessrevamp_refund/);
  assert.match(authorization, /requireOperator/);
  assert.match(execution, /STRIPE_REFUND_SECRET_KEY/);
  assert.match(execution, /idempotencyKey: `accessrevamp_refund_/);
  assert.doesNotMatch(execution, /for\s*\(|forEach|Promise\.all/);
  assert.match(env, /STRIPE_CHECKOUT_SECRET_KEY=/);
  assert.match(env, /STRIPE_WEBHOOK_READ_SECRET_KEY=/);
  assert.match(env, /STRIPE_REFUND_SECRET_KEY=/);
});
