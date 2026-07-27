import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CLOUDFLARE_PRODUCTION_VARS,
  configureCloudflareWorker,
} from '../scripts/configure-cloudflare-worker.mjs';

test('Cloudflare Worker catch-all renders the existing AccessRevamp browser application', async () => {
  const [page, clientShell] = await Promise.all([
    readFile('app/[[...slug]]/page.tsx', 'utf8'),
    readFile('app/accessrevamp-client.tsx', 'utf8'),
  ]);

  assert.match(page, /AccessRevampClient/);
  assert.match(clientShell, /id="app"/);
  assert.match(clientShell, /import\("\.\.\/src\/main\.js"\)/);
});

test('Cloudflare Worker metadata describes the finished AccessRevamp experience', async () => {
  const layout = await readFile('app/layout.tsx', 'utf8');

  assert.match(layout, /AccessRevamp/);
  assert.match(layout, /Evidence-led website revamps/);
  assert.doesNotMatch(layout, /codex-preview|site-creator-vinext-starter/);
});

test('Cloudflare Worker routes customer APIs before the browser catch-all', async () => {
  const worker = await readFile('worker/index.ts', 'utf8');
  for (const route of [
    '/api/account-projects',
    '/api/auth-login-complete',
    '/api/auth-login-start',
    '/api/auth-signup-resend',
    '/api/auth-signup-start',
    '/api/checkout-status',
    '/api/contact',
    '/api/create-checkout',
    '/api/free-snapshot',
    '/api/order-draft',
    '/api/payment-health',
    '/api/pricing-context',
    '/api/project-approval',
    '/api/project-intake',
    '/api/refund-authorization',
    '/api/refund-execute',
    '/api/stripe-webhook',
  ]) {
    assert.match(worker, new RegExp(route.replaceAll('/', '\\/')));
  }
  assert.match(worker, /routes\.get\(pathname\)/);
  assert.match(worker, /return handler\.fetch/);
  assert.doesNotMatch(worker, /operatorOverview|operator-overview\.mjs/);
  assert.match(worker, /retiredPrivatePaths/);
});

test('Cloudflare production builds preserve required non-secret runtime bindings', async () => {
  const configured = configureCloudflareWorker({
    name: 'generated-name',
    vars: {},
    assets: { binding: 'ASSETS' },
  });

  assert.equal(configured.name, 'accessrevamp');
  assert.equal(configured.compatibility_date, '2026-07-27');
  assert.deepEqual(configured.compatibility_flags, ['nodejs_compat']);
  assert.deepEqual(configured.observability, {
    enabled: true,
    head_sampling_rate: 1,
  });
  assert.deepEqual(configured.vars, CLOUDFLARE_PRODUCTION_VARS);
  assert.equal(configured.vars.ACCESSREVAMP_LIVE_PAYMENT_APPROVED, 'true');
  assert.equal(configured.vars.STRIPE_EXPECT_LIVEMODE, 'true');
  assert.equal(configured.vars.SUPABASE_URL, 'https://vbkkimvedmklebghtkzs.supabase.co');
  assert.match(configured.vars.ALLOWED_ORIGINS, /https:\/\/accessrevamp\.com/);
  assert.deepEqual(configured.assets, { binding: 'ASSETS' });
  assert.equal(
    Object.keys(configured.vars).some((name) => /SECRET|PASSWORD|TOKEN|SERVICE_ROLE/i.test(name)),
    false,
  );

  const [packageJson, workflow] = await Promise.all([
    readFile('package.json', 'utf8'),
    readFile('.github/workflows/deploy-cloudflare-worker.yml', 'utf8'),
  ]);
  assert.match(packageJson, /node scripts\/configure-cloudflare-worker\.mjs/);
  assert.match(workflow, /VITE_PAYMENT_MODE:\s*"live"/);
});
