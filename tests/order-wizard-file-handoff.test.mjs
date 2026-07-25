import assert from 'node:assert/strict';
import test from 'node:test';

const REQUEST_ID = '55b9d4ad-210a-4e74-919f-0d6f8f2844d2';
const DRAFT_ID = '8d13176a-601c-4f91-aa7a-8f3de90f8caf';

test('reference files are persisted in the authenticated draft before Stripe is requested', async () => {
  const checkoutService = await import('../src/services/persisted-checkout.js').catch(() => ({}));
  assert.equal(typeof checkoutService.persistDraftThenCreateCheckout, 'function');
  const draftBody = new FormData();
  draftBody.set('requestId', REQUEST_ID);
  draftBody.set('orderPlan', 'complete_revamp');
  draftBody.set('referenceFiles', new Blob(['reference'], { type: 'text/plain' }), 'reference.txt');
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url === '/api/order-draft') {
      assert.equal(options.body.get('referenceFiles').name, 'reference.txt');
      return new Response(JSON.stringify({ draftId: DRAFT_ID, requestId: REQUEST_ID }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }
    assert.equal(calls[0].url, '/api/order-draft');
    return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/cs_live_example' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await checkoutService.persistDraftThenCreateCheckout({
    draftBody,
    targetTier: 'complete_revamp',
    requestId: REQUEST_ID,
    accessToken: 'confirmed-session-token',
    fetchImpl,
  });

  assert.deepEqual(calls.map((call) => call.url), ['/api/order-draft', '/api/create-checkout']);
  assert.equal(result.url, 'https://checkout.stripe.com/c/pay/cs_live_example');
});

test('Stripe is never requested when private draft persistence fails', async () => {
  const checkoutService = await import('../src/services/persisted-checkout.js').catch(() => ({}));
  assert.equal(typeof checkoutService.persistDraftThenCreateCheckout, 'function');
  const calls = [];
  await assert.rejects(
    checkoutService.persistDraftThenCreateCheckout({
      draftBody: new FormData(),
      targetTier: 'complete_revamp',
      requestId: REQUEST_ID,
      accessToken: 'confirmed-session-token',
      fetchImpl: async (url) => {
        calls.push(url);
        return new Response(JSON.stringify({ error: 'Draft unavailable' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        });
      },
    }),
    /project request was not saved/i,
  );
  assert.deepEqual(calls, ['/api/order-draft']);
});

test('a safe draft validation message explains what must be corrected', async () => {
  const checkoutService = await import('../src/services/persisted-checkout.js').catch(() => ({}));
  await assert.rejects(
    checkoutService.persistDraftThenCreateCheckout({
      draftBody: new FormData(),
      targetTier: 'complete_revamp',
      requestId: REQUEST_ID,
      accessToken: 'confirmed-session-token',
      fetchImpl: async () => new Response(JSON.stringify({
        error: 'Use the confirmed account email for checkout.',
      }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    }),
    /Use the confirmed account email for checkout/,
  );
});
