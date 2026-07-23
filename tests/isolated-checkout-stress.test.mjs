import assert from 'node:assert/strict';
import test from 'node:test';

import { createCheckoutHandler } from '../netlify/functions/create-checkout.mjs';
import { requireCheckoutRuntime } from '../netlify/functions/_shared/payment-runtime.mjs';
import { installIsolatedPaymentEnv, PaymentHarness } from './helpers/isolated-payment-core.mjs';
import { checkoutRequest, FakeStripe, readJson } from './helpers/isolated-stripe.mjs';

installIsolatedPaymentEnv();

function setup(planKey = 'complete_revamp') {
  const harness = new PaymentHarness();
  const stripe = new FakeStripe(harness);
  const { user, token } = harness.addUser();
  const draft = harness.addDraft(user, planKey);
  const handler = createCheckoutHandler({ getAdmin: () => harness.admin, createStripe: () => stripe, requireRuntime: requireCheckoutRuntime });
  return { harness, stripe, user, token, draft, handler };
}

test('public Checkout handler rejects a non-live runtime before reservation or provider access', async () => {
  const harness = new PaymentHarness();
  const stripe = new FakeStripe(harness);
  const { user, token } = harness.addUser();
  const draft = harness.addDraft(user, 'complete_revamp');
  const handler = createCheckoutHandler({ getAdmin: () => harness.admin, createStripe: () => stripe });

  const response = await handler(checkoutRequest({
    token,
    requestId: draft.request_id,
    targetTier: draft.plan_key,
  }));

  assert.equal(response.status, 503);
  assert.equal(harness.reservations.size, 0);
  assert.equal(stripe.checkoutAttempts, 0);
});

test('250 duplicate checkout submissions collapse into one provider session', { timeout: 30_000 }, async () => {
  const fixture = setup();
  const responses = await Promise.all(Array.from({ length: 250 }, () => fixture.handler(checkoutRequest({
    token: fixture.token,
    requestId: fixture.draft.request_id,
    targetTier: fixture.draft.plan_key,
  }))));
  const bodies = await Promise.all(responses.map(readJson));

  assert.deepEqual(new Set(responses.map((response) => response.status)), new Set([201]));
  assert.equal(new Set(bodies.map((body) => body.url)).size, 1);
  assert.equal(fixture.stripe.checkoutCreations, 1);
  assert.equal(fixture.harness.reservations.size, 1);
  assert.equal(fixture.draft.status, 'checkout_created');
  assert.equal(fixture.harness.incidents.size, 0);
});

test('40-customer burst keeps every user, request, plan and session isolated', { timeout: 30_000 }, async () => {
  const harness = new PaymentHarness();
  const stripe = new FakeStripe(harness);
  const handler = createCheckoutHandler({ getAdmin: () => harness.admin, createStripe: () => stripe, requireRuntime: requireCheckoutRuntime });
  const fixtures = Array.from({ length: 40 }, (_, index) => {
    const { user, token } = harness.addUser(`burst-${index}@example.test`);
    const plan = ['homepage_reveal', 'complete_revamp', 'cinematic_scroll'][index % 3];
    return { user, token, draft: harness.addDraft(user, plan) };
  });

  const responses = await Promise.all(fixtures.flatMap((fixture) => Array.from({ length: 5 }, () => handler(checkoutRequest({
    token: fixture.token,
    requestId: fixture.draft.request_id,
    targetTier: fixture.draft.plan_key,
  })))));

  assert.deepEqual(new Set(responses.map((response) => response.status)), new Set([201]));
  assert.equal(stripe.checkoutCreations, fixtures.length);
  assert.equal(harness.reservations.size, fixtures.length);
  for (const fixture of fixtures) {
    const sessions = [...stripe.sessions.values()].filter((session) => session.client_reference_id === fixture.user.id);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].customer_email, fixture.user.email);
    assert.equal(sessions[0].metadata.checkout_request_id, fixture.draft.request_id);
    assert.equal(sessions[0].metadata.to_tier, fixture.draft.plan_key);
  }
});

test('350 malformed or hostile requests never reach Stripe', { timeout: 30_000 }, async () => {
  const fixture = setup();
  const cases = [
    () => checkoutRequest({ token: fixture.token, requestId: fixture.draft.request_id, method: 'GET' }),
    () => checkoutRequest({ token: fixture.token, requestId: fixture.draft.request_id, origin: 'https://attacker.invalid' }),
    () => checkoutRequest({ token: fixture.token, requestId: fixture.draft.request_id, contentType: 'text/plain' }),
    () => checkoutRequest({ token: fixture.token, requestId: 'not-a-uuid' }),
    () => checkoutRequest({ token: fixture.token, requestId: fixture.draft.request_id, targetTier: 'refund_every_customer' }),
    () => checkoutRequest({ requestId: fixture.draft.request_id }),
    () => checkoutRequest({ token: fixture.token, requestId: fixture.draft.request_id, body: '{broken-json' }),
  ];

  const responses = await Promise.all(Array.from({ length: 350 }, (_, index) => fixture.handler(cases[index % cases.length]())));
  assert.ok(responses.every((response) => response.status >= 400));
  assert.equal(fixture.stripe.checkoutAttempts, 0);
  assert.equal(fixture.harness.reservations.size, 0);
});

test('runtime kill switches reject 300 attempts before reservation or Stripe', { timeout: 30_000 }, async () => {
  const disabled = setup();
  disabled.harness.settings.checkout_enabled = false;
  const disabledResponses = await Promise.all(Array.from({ length: 100 }, () => disabled.handler(checkoutRequest({
    token: disabled.token,
    requestId: disabled.draft.request_id,
    targetTier: disabled.draft.plan_key,
  }))));
  assert.ok(disabledResponses.every((response) => response.status === 503));
  assert.equal(disabled.harness.reservations.size, 0);
  assert.equal(disabled.stripe.checkoutAttempts, 0);

  const stale = setup();
  stale.harness.settings.configuration_verified_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const staleResponses = await Promise.all(Array.from({ length: 100 }, () => stale.handler(checkoutRequest({
    token: stale.token,
    requestId: stale.draft.request_id,
    targetTier: stale.draft.plan_key,
  }))));
  assert.ok(staleResponses.every((response) => response.status === 503));
  assert.equal(stale.harness.reservations.size, 0);
  assert.equal(stale.stripe.checkoutAttempts, 0);

  const modeMismatch = setup();
  modeMismatch.harness.settings.expected_livemode = true;
  const modeResponses = await Promise.all(Array.from({ length: 100 }, () => modeMismatch.handler(checkoutRequest({
    token: modeMismatch.token,
    requestId: modeMismatch.draft.request_id,
    targetTier: modeMismatch.draft.plan_key,
  }))));
  assert.ok(modeResponses.every((response) => response.status === 503));
  assert.equal(modeMismatch.harness.reservations.size, 0);
  assert.equal(modeMismatch.stripe.checkoutAttempts, 0);
});

test('catalog mismatch never creates Stripe sessions and records one deduplicated incident', { timeout: 30_000 }, async () => {
  const fixture = setup('homepage_reveal');
  fixture.harness.catalog.get('none->homepage_reveal').net_cents = 5_001;

  const responses = await Promise.all(Array.from({ length: 120 }, () => fixture.handler(checkoutRequest({
    token: fixture.token,
    requestId: fixture.draft.request_id,
    targetTier: fixture.draft.plan_key,
  }))));

  assert.ok(responses.every((response) => response.status === 503));
  assert.equal(fixture.stripe.checkoutAttempts, 0);
  assert.equal(fixture.harness.reservations.size, 1);
  assert.equal([...fixture.harness.incidents.keys()].filter((key) => key.startsWith('checkout-create-failed:')).length, 1);
});

test('attachment failure expires Stripe and cancels both saved states', async () => {
  const fixture = setup();
  fixture.harness.forceAttachFailure = true;

  const response = await fixture.handler(checkoutRequest({
    token: fixture.token,
    requestId: fixture.draft.request_id,
    targetTier: fixture.draft.plan_key,
  }));

  assert.equal(response.status, 503);
  assert.equal(fixture.stripe.checkoutCreations, 1);
  assert.equal(fixture.stripe.expired.size, 1);
  assert.equal(fixture.draft.status, 'canceled');
  assert.ok([...fixture.harness.reservations.values()].every((row) => row.status === 'canceled'));
  assert.ok([...fixture.harness.incidents.keys()].some((key) => key.startsWith('checkout-attach-failed:')));
});
