import assert from 'node:assert/strict';
import test from 'node:test';

import { createRefundExecutionHandler } from '../netlify/functions/refund-execute.mjs';
import { installIsolatedPaymentEnv, PaymentHarness } from './helpers/isolated-payment-core.mjs';
import { FakeStripe, refundRequest } from './helpers/isolated-stripe.mjs';

installIsolatedPaymentEnv();

function setup() {
  const harness = new PaymentHarness();
  const stripe = new FakeStripe(harness);
  const { user: operator, token } = harness.addUser('operator@example.test');
  harness.addOperator(operator);
  const authorization = harness.addAuthorization(operator.id);
  const handler = createRefundExecutionHandler({ getAdmin: () => harness.admin, createStripe: () => stripe });
  return { harness, stripe, operator, token, authorization, handler };
}

test('200 concurrent refund commands create one provider refund', { timeout: 30_000 }, async () => {
  const fixture = setup();
  const responses = await Promise.all(Array.from({ length: 200 }, () => fixture.handler(refundRequest(
    fixture.token,
    fixture.authorization.id,
  ))));

  assert.equal(responses.filter((response) => response.status === 202).length, 1);
  assert.equal(responses.filter((response) => response.status === 409).length, 199);
  assert.equal(fixture.stripe.refundCreations, 1);
  assert.equal(fixture.authorization.stripe_refund_id, [...fixture.stripe.refundsByKey.values()][0].id);
  assert.equal(fixture.harness.incidents.size, 0);
});

test('ambiguous provider response loss retries with one idempotent refund', async () => {
  const fixture = setup();
  fixture.stripe.failRefundResponseOnce = true;

  const first = await fixture.handler(refundRequest(fixture.token, fixture.authorization.id));
  assert.equal(first.status, 500);
  assert.equal(fixture.authorization.status, 'approved');
  assert.equal(fixture.stripe.refundCreations, 1);

  const retry = await fixture.handler(refundRequest(fixture.token, fixture.authorization.id));
  assert.equal(retry.status, 202);
  assert.equal(fixture.stripe.refundAttempts, 2);
  assert.equal(fixture.stripe.refundCreations, 1);
  assert.ok(fixture.authorization.stripe_refund_id?.startsWith('re_test_'));
});

test('refund kill switch rejects 150 execution attempts before Stripe', { timeout: 30_000 }, async () => {
  const fixture = setup();
  const originalRpc = fixture.harness.admin.rpc;
  fixture.harness.admin.rpc = async (name, args) => {
    if (name === 'claim_accessrevamp_refund_execution') {
      return { data: null, error: { code: '55000', message: 'Refund execution is paused' } };
    }
    return originalRpc(name, args);
  };

  const responses = await Promise.all(Array.from({ length: 150 }, () => fixture.handler(refundRequest(
    fixture.token,
    fixture.authorization.id,
  ))));

  assert.ok(responses.every((response) => response.status === 409));
  assert.equal(fixture.stripe.refundAttempts, 0);
  assert.equal(fixture.stripe.refundCreations, 0);
  assert.equal(fixture.authorization.status, 'approved');
});

test('inactive operator flood cannot claim or create a refund', { timeout: 30_000 }, async () => {
  const fixture = setup();
  fixture.harness.operators.clear();
  const responses = await Promise.all(Array.from({ length: 100 }, () => fixture.handler(refundRequest(
    fixture.token,
    fixture.authorization.id,
  ))));

  assert.ok(responses.every((response) => response.status === 403));
  assert.equal(fixture.stripe.refundAttempts, 0);
  assert.equal(fixture.authorization.status, 'approved');
});

test('hostile refund requests never call Stripe', { timeout: 30_000 }, async () => {
  const fixture = setup();
  const invalid = [
    new Request('https://accessrevamp.test/api/refund-execute', { method: 'GET' }),
    new Request('https://accessrevamp.test/api/refund-execute', {
      method: 'POST', headers: { origin: 'https://attacker.invalid', authorization: `Bearer ${fixture.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ authorizationId: fixture.authorization.id }),
    }),
    new Request('https://accessrevamp.test/api/refund-execute', {
      method: 'POST', headers: { origin: 'https://accessrevamp.test', authorization: `Bearer ${fixture.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ authorizationId: 'refund-all-customers' }),
    }),
    new Request('https://accessrevamp.test/api/refund-execute', {
      method: 'POST', headers: { origin: 'https://accessrevamp.test', 'content-type': 'application/json' },
      body: JSON.stringify({ authorizationId: fixture.authorization.id }),
    }),
  ];

  const responses = await Promise.all(Array.from({ length: 200 }, (_, index) => fixture.handler(invalid[index % invalid.length].clone())));
  assert.ok(responses.every((response) => response.status >= 400));
  assert.equal(fixture.stripe.refundAttempts, 0);
  assert.equal(fixture.stripe.refundCreations, 0);
});
