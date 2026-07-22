import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

test('contact preserves the strict public payload and accessible request states', async () => {
  const [page, service] = await Promise.all([read('src/pages/contact.js'), read('src/services/contact.js')]);
  for (const field of ['firstName', 'lastName', 'email', 'websiteUrl', 'message', 'consent', 'companyFax']) {
    assert.match(page, new RegExp(`name="${field}"`));
    assert.match(service, new RegExp(`${field}`));
  }
  assert.match(service, /\/api\/contact/);
  assert.match(service, /response\.status === 429/);
  assert.match(page, /aria-live="polite"/);
});

test('checkout saves one stable request and uses only a server-created Stripe URL', async () => {
  const [checkout, wizard] = await Promise.all([
    read('src/services/checkout.js'),
    read('src/services/order-wizard.js'),
  ]);
  assert.match(checkout, /\/api\/order-draft/);
  assert.match(checkout, /\/api\/create-checkout/);
  assert.match(wizard, /crypto\.randomUUID\(\)/);
  assert.match(wizard, /requestId/);
  assert.match(checkout, /form\.dataset\.orderRequestId/);
  assert.ok(
    checkout.indexOf('fetch(ORDER_DRAFT_ENDPOINT') < checkout.indexOf('fetch(CHECKOUT_ENDPOINT'),
    'the project request must be saved before Checkout is created',
  );
  assert.match(checkout, /checkout\.stripe\.com/);
  assert.doesNotMatch(checkout, /book\.stripe\.com|payment[_-]?link/i);
  assert.match(checkout, /aria-busy/);
  assert.match(checkout, /Checkout unavailable|Secure checkout is paused/);
  assert.match(checkout, /setAttribute\('disabled'/);
  assert.match(checkout, /removeEventListener/);
});

test('auth and dashboard cover missing configuration and explicitly scope customer reads', async () => {
  const [auth, dashboard] = await Promise.all([read('src/services/auth.js'), read('src/services/dashboard.js')]);
  assert.match(auth, /Supabase is not connected/);
  assert.match(auth, /Enter the six digits from the newest AccessRevamp email/);
  assert.match(auth, /verifyOtp/);
  assert.equal((dashboard.match(/\.eq\('user_id', session\.user\.id\)/g) || []).length, 2);
  assert.match(dashboard, /Workspace configuration pending/);
  assert.match(dashboard, /Sign in to continue/);
  assert.match(dashboard, /partial/i);
});

test('legal, account, checkout-result, and internal-boundary routes stay explicit', async () => {
  const [main, legal] = await Promise.all([read('src/main.js'), read('src/pages/legal.js')]);
  for (const route of ['/contact', '/login', '/signup', '/dashboard', '/privacy', '/terms', '/accessibility', '/refunds', '/legal', '/success', '/cancel']) {
    assert.match(main, new RegExp(`'${route.replace('/', '\\/')}'`));
  }
  assert.match(legal, /refundPolicy/);
  assert.doesNotMatch(`${main}\n${legal}`, /1ETfgTPdIBnO5J6Rburhx-2iYwR72ke6S|drive\.google\.com/i);
});
