import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutReadiness } from '../src/services/checkout-readiness.js';

test('checkout readiness accepts only an exact ready response', async () => {
  const result = await checkoutReadiness(async (url, options) => {
    assert.equal(url, '/api/payment-health');
    assert.deepEqual(options, { headers: { accept: 'application/json' }, cache: 'no-store' });
    return new Response(JSON.stringify({ ready: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  assert.deepEqual(result, { ready: true });
});

test('checkout readiness fails closed for unavailable or malformed health responses', async () => {
  for (const response of [
    new Response(JSON.stringify({ ready: false }), { status: 503 }),
    new Response(JSON.stringify({ ready: true, detail: 'extra' }), { status: 200 }),
    new Response('not-json', { status: 200 }),
  ]) {
    assert.deepEqual(await checkoutReadiness(async () => response), { ready: false });
  }
});

test('checkout readiness fails closed when the health request cannot complete', async () => {
  assert.deepEqual(await checkoutReadiness(async () => {
    throw new Error('offline');
  }), { ready: false });
});
