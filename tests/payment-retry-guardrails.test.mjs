import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('terminal Checkout attempts rotate to a fresh request ID without reusing Stripe idempotency', async () => {
  const [draft, client, wizard] = await Promise.all([
    read('netlify/functions/order-draft.mjs'),
    read('src/services/checkout.js'),
    read('src/services/order-wizard.js'),
  ]);
  assert.match(draft, /REUSABLE_TERMINAL_STATES = new Set\(\['expired', 'canceled'\]\)/);
  assert.match(draft, /effectiveRequestId.*randomUUID\(\)/s);
  assert.match(draft, /This project request is already paid/);
  assert.match(draft, /requestId: effectiveRequestId/);
  assert.match(client, /draftPayload\.requestId !== requestId/);
  assert.match(client, /order-request-id-rotated/);
  assert.match(wizard, /onRequestIdRotated/);
  assert.match(wizard, /requestId = nextRequestId/);
});

test('saved private references are replaced exactly, including an explicit empty selection', async () => {
  const draft = await read('netlify/functions/order-draft.mjs');
  const oldPathsIndex = draft.indexOf('const oldPaths =');
  const filesConditionalIndex = draft.indexOf('if (files.length)');
  assert.ok(oldPathsIndex > filesConditionalIndex, 'replacement logic must not be trapped inside a files-only branch');
  assert.match(draft, /order_draft_assets'\)\.delete\(\)\.in\('storage_path', oldPaths\)/);
  assert.match(draft, /storage\.from\(BUCKET\)\.remove\(oldPaths\)/);
  assert.match(draft, /order-draft-orphaned-assets/);
});

test('an interrupted Checkout safely reuses the active session or cancels its database reservation', async () => {
  const checkout = await read('netlify/functions/create-checkout.mjs');
  assert.match(checkout, /\['draft', 'checkout_created'\]\.includes\(draft\.status\)/);
  assert.match(checkout, /idempotencyKey: `accessrevamp_checkout_/);
  assert.match(checkout, /checkout\.sessions\.expire\(session\.id\)/);
  assert.match(checkout, /Promise\.allSettled/);
  assert.match(checkout, /status: 'canceled'/);
  assert.match(checkout, /checkout-attach-failed/);
});

test('the success page never treats a browser redirect as proof of payment', async () => {
  const [page, service, statusFunction, main] = await Promise.all([
    read('src/pages/results.js'),
    read('src/services/checkout-result.js'),
    read('netlify/functions/checkout-status.mjs'),
    read('src/main.js'),
  ]);
  assert.match(page, /The browser redirect is not payment proof/);
  assert.doesNotMatch(page, /Checkout complete/);
  assert.match(page, /data-checkout-result/);
  assert.match(service, /\/api\/checkout-status\?session_id=/);
  assert.match(service, /Do not pay again/);
  assert.match(service, /payload\.status === 'paid' && payload\.projectId/);
  assert.match(service, /localStorage\.removeItem\(STORAGE_KEY\)/);
  assert.match(statusFunction, /requireConfirmedUser/);
  assert.match(statusFunction, /\.from\('orders'\)/);
  assert.match(statusFunction, /\.from\('upgrade_reservations'\)/);
  assert.match(statusFunction, /paid-order-incomplete/);
  assert.match(main, /setupCheckoutResult/);
  assert.match(main, /pathname === '\/success'/);
});
