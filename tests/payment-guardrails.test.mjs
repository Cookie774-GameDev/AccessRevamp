import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('payment runtime remains fail closed until a verified catalog and configuration are present', async () => {
  const [core, functions, monitoring, runtime] = await Promise.all([
    read('supabase/migrations/20260720170000_payment_runtime_guardrails.sql'),
    read('supabase/migrations/20260720170100_payment_runtime_functions.sql'),
    read('supabase/migrations/20260720170200_payment_runtime_monitoring.sql'),
    read('netlify/functions/_shared/payment-runtime.mjs'),
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
});

test('checkout saves a confirmed order draft before creating one idempotent Stripe session', async () => {
  const [client, draft, checkout, component] = await Promise.all([
    read('src/services/checkout.js'),
    read('netlify/functions/order-draft.mjs'),
    read('netlify/functions/create-checkout.mjs'),
    read('src/components/order-wizard.js'),
  ]);
  assert.match(client, /ORDER_DRAFT_ENDPOINT/);
  assert.ok(client.indexOf('fetch(ORDER_DRAFT_ENDPOINT') < client.indexOf('fetch(CHECKOUT_ENDPOINT'));
  assert.match(client, /Your project request was not saved — no payment started/);
  assert.match(draft, /save_accessrevamp_order_draft/);
  assert.match(draft, /order-draft-assets/);
  assert.match(draft, /requireConfirmedUser/);
  assert.match(checkout, /\.from\('order_drafts'\)/);
  assert.match(checkout, /STRIPE_CHECKOUT_SECRET_KEY/);
  assert.match(checkout, /resolveCatalogPrice/);
  assert.match(checkout, /idempotencyKey: `accessrevamp_checkout_/);
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
  assert.match(webhook, /last_successful_webhook_at/);
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
