import assert from 'node:assert/strict';
import test from 'node:test';

import { createCheckoutHandler } from '../netlify/functions/create-checkout.mjs';
import { createWebhookHandler } from '../netlify/functions/stripe-webhook.mjs';
import { installIsolatedPaymentEnv, PaymentHarness } from './helpers/isolated-payment-core.mjs';
import { checkoutRequest, FakeStripe, readJson, webhookRequest } from './helpers/isolated-stripe.mjs';

installIsolatedPaymentEnv();

async function paidFixture(plan = 'complete_revamp') {
  const harness = new PaymentHarness();
  const stripe = new FakeStripe(harness);
  const { user, token } = harness.addUser();
  const draft = harness.addDraft(user, plan);
  const checkout = createCheckoutHandler({ getAdmin: () => harness.admin, createStripe: () => stripe });
  const response = await checkout(checkoutRequest({ token, requestId: draft.request_id, targetTier: plan }));
  assert.equal(response.status, 201, JSON.stringify(await readJson(response.clone())));
  const session = [...stripe.sessions.values()][0];
  stripe.markPaid(session.id);
  const webhook = createWebhookHandler({ getAdmin: () => harness.admin, createStripe: () => stripe });
  return { harness, stripe, user, token, draft, session, webhook };
}

test('300 duplicate paid events create exactly one order, entitlement and project', { timeout: 30_000 }, async () => {
  const fixture = await paidFixture();
  const event = {
    id: 'evt_test_duplicate_paid_001',
    type: 'checkout.session.completed',
    livemode: false,
    data: { object: { id: fixture.session.id } },
  };

  const responses = await Promise.all(Array.from({ length: 300 }, () => fixture.webhook(webhookRequest(event))));
  assert.deepEqual(new Set(responses.map((response) => response.status)), new Set([200]));
  assert.equal(fixture.harness.orders.size, 1);
  assert.equal(fixture.harness.entitlements.size, 1);
  assert.equal(fixture.harness.projects.size, 1);
  assert.equal(fixture.harness.events.size, 1);
  assert.equal(fixture.draft.status, 'paid');
});

test('late terminal events cannot undo a paid order', { timeout: 30_000 }, async () => {
  const fixture = await paidFixture();
  const paid = {
    id: 'evt_test_paid_before_expired',
    type: 'checkout.session.completed',
    livemode: false,
    data: { object: { id: fixture.session.id } },
  };
  assert.equal((await fixture.webhook(webhookRequest(paid))).status, 200);

  const expired = {
    id: 'evt_test_late_expired',
    type: 'checkout.session.expired',
    livemode: false,
    data: { object: { id: fixture.session.id } },
  };
  const responses = await Promise.all(Array.from({ length: 75 }, () => fixture.webhook(webhookRequest(expired))));
  assert.deepEqual(new Set(responses.map((response) => response.status)), new Set([200]));
  assert.equal([...fixture.harness.orders.values()][0].status, 'paid');
  assert.equal(fixture.draft.status, 'paid');
});

test('75 invalid-price webhooks never fulfill and deduplicate the incident', { timeout: 30_000 }, async () => {
  const fixture = await paidFixture('homepage_reveal');
  fixture.stripe.sessions.get(fixture.session.id).line_items.data[0].price = 'price_attacker_controlled';
  const event = {
    id: 'evt_test_bad_price_001',
    type: 'checkout.session.completed',
    livemode: false,
    data: { object: { id: fixture.session.id } },
  };

  const responses = await Promise.all(Array.from({ length: 75 }, () => fixture.webhook(webhookRequest(event))));
  assert.ok(responses.every((response) => response.status === 500));
  assert.equal(fixture.harness.orders.size, 0);
  assert.equal(fixture.harness.projects.size, 0);
  assert.equal(fixture.harness.entitlements.size, 0);
  assert.equal([...fixture.harness.incidents.keys()].filter((key) => key === `webhook-failure:${event.id}`).length, 1);
});

test('oversized and unsigned webhooks are rejected before fulfillment', async () => {
  const fixture = await paidFixture();
  const oversized = await fixture.webhook(webhookRequest({}, 'x'.repeat(1_000_001)));
  assert.equal(oversized.status, 413);

  const unsigned = new Request('https://accessrevamp.test/api/stripe-webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'evt_unsigned', type: 'checkout.session.completed', livemode: false, data: { object: { id: fixture.session.id } } }),
  });
  assert.equal((await fixture.webhook(unsigned)).status, 503);
  assert.equal(fixture.harness.orders.size, 0);
});
