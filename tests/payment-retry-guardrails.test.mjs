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

test('saved private references are transferred or replaced exactly across a fresh attempt', async () => {
  const draft = await read('netlify/functions/order-draft.mjs');
  assert.match(draft, /rotatedFromDraftId && files\.length === 0/);
  assert.match(draft, /\.update\(\{ draft_id: draftId \}\)/);
  assert.match(draft, /const pathsToReplace =/);
  assert.match(draft, /assetPaths\(admin, rotatedFromDraftId\)/);
  assert.match(draft, /order_draft_assets'\)\.delete\(\)\.in\('storage_path', pathsToReplace\)/);
  assert.match(draft, /storage\.from\(BUCKET\)\.remove\(pathsToReplace\)/);
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
  assert.match(page, /aria-live="polite"/);
  assert.match(service, /\/api\/checkout-status\?session_id=/);
  assert.match(service, /Do not pay again/);
  assert.match(service, /payload\.status === 'paid' && payload\.projectId/);
  assert.match(service, /localStorage\.removeItem\(STORAGE_KEY\)/);
  assert.match(statusFunction, /requireConfirmedUser/);
  assert.match(statusFunction, /\.from\('orders'\)/);
  assert.match(statusFunction, /\.from\('entitlements'\)/);
  assert.match(statusFunction, /\.from\('upgrade_reservations'\)/);
  assert.match(statusFunction, /paid-order-incomplete/);
  assert.match(main, /setupCheckoutResult/);
  assert.match(main, /pathname === '\/success'/);
});
