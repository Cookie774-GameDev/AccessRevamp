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

test('checkout uses only a server-created Stripe URL and exposes busy/failure states', async () => {
  const service = await read('src/services/checkout.js');
  assert.match(service, /\/api\/create-checkout/);
  assert.match(service, /crypto\.randomUUID\(\)/);
  assert.match(service, /checkout\.stripe\.com/);
  assert.doesNotMatch(service, /book\.stripe\.com|checkoutUrl/);
  assert.match(service, /aria-busy/);
  assert.match(service, /Checkout unavailable/);
  assert.match(service, /setAttribute\('disabled'/);
  assert.match(service, /removeEventListener/);
});

test('auth and dashboard cover missing configuration and explicitly scope customer reads', async () => {
  const [auth, dashboard] = await Promise.all([read('src/services/auth.js'), read('src/services/dashboard.js')]);
  assert.match(auth, /Supabase is not connected/);
  assert.match(auth, /Check your email to confirm/);
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
