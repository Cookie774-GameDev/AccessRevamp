import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { extractJavaScriptBundleUrls } from '../scripts/quality/auth-preview-bundles.mjs';

const read = (path) => readFile(path, 'utf8');

test('public trust copy contains no unsupported customer-count claim', async () => {
  const [home, interactions] = await Promise.all([
    read('src/pages/home.js'),
    read('src/pages/home-interactions.js'),
  ]);
  assert.doesNotMatch(`${home}\n${interactions}`, /\b87\b|happy customers|data-customer-count/i);
});

test('password challenge secrets never enter login URLs or browser query parsing', async () => {
  const [start, client, proxy, productionAuthVerifier] = await Promise.all([
    read('netlify/functions/auth-login-start.mjs'),
    read('src/services/auth.js'),
    read('proxy.ts'),
    read('scripts/quality/verify-netlify-auth-preview.mjs'),
  ]);
  assert.doesNotMatch(start, /searchParams\.set\(['"]verification['"],\s*challengeToken\)/);
  assert.doesNotMatch(client, /params\.get\(['"]verification['"]\)/);
  assert.match(proxy, /"\/login"/);
  assert.match(proxy, /"Referrer-Policy":\s*"no-referrer"/);
  assert.match(productionAuthVerifier, /Referrer-Policy'\], 'no-referrer'/);
});

test('order drafts are short-lived session data rather than indefinite local data', async () => {
  const [wizard, result] = await Promise.all([
    read('src/services/order-wizard.js'),
    read('src/services/checkout-result.js'),
  ]);
  assert.doesNotMatch(`${wizard}\n${result}`, /localStorage/);
  assert.match(wizard, /sessionStorage/);
  assert.match(wizard, /DRAFT_TTL_MS/);
  assert.match(wizard, /savedAt/);
});

test('checkout uses a configured canonical return origin and can reuse a Stripe customer', async () => {
  const checkout = await read('netlify/functions/create-checkout.mjs');
  assert.match(checkout, /ACCESSREVAMP_SITE_URL/);
  assert.doesNotMatch(checkout, /new URL\(request\.url\)\.origin/);
  assert.match(checkout, /stripe_customer_id/);
  assert.doesNotMatch(checkout, /customer_creation:\s*'always'/);
});

test('uploaded reference files are image-only and verified by file signature', async () => {
  const [draft, signatures] = await Promise.all([
    read('netlify/functions/order-draft.mjs'),
    read('netlify/functions/_shared/file-signatures.mjs'),
  ]);
  assert.doesNotMatch(draft, /video\/mp4|application\/pdf|application\/zip/);
  assert.match(draft, /assertVerifiedImage/);
  assert.match(signatures, /image\/jpeg/);
  assert.match(signatures, /image\/png/);
  assert.match(signatures, /image\/webp/);
  assert.match(signatures, /image\/avif/);
});

test('webhook health and dispute processing are event-specific', async () => {
  const webhook = await read('netlify/functions/stripe-webhook.mjs');
  assert.match(webhook, /DISPUTE_EVENTS/);
  assert.match(webhook, /reconcile_accessrevamp_dispute/);
  assert.match(webhook, /record_accessrevamp_webhook_outcome/);
  assert.doesNotMatch(webhook, /\.update\(\{\s*last_successful_webhook_at/);
});

test('only the canonical CI and Cloudflare deployment workflows remain', async () => {
  const workflows = await readdir('.github/workflows');
  assert.deepEqual(
    workflows.filter((name) => /^accessrevamp-finalize-v\d+\.yml$/.test(name)),
    [],
  );
  const deploy = await read('.github/workflows/deploy-cloudflare-worker.yml');
  assert.match(deploy, /verify:production-smoke/);
});

test('refund copy consistently promises a full refund before final digital delivery', async () => {
  const [policy, legal] = await Promise.all([
    read('src/data/policies.js'),
    read('src/pages/legal.js'),
  ]);
  assert.match(policy, /full refund before final digital delivery/i);
  assert.match(legal, /valid request made before final digital delivery is eligible for a full refund/i);
  assert.doesNotMatch(legal, /Before final delivery[^]*incurred costs/i);
});

test('production auth smoke resolves root asset references without duplicating the assets path', () => {
  const urls = extractJavaScriptBundleUrls(
    'const chunk = "assets/auth-runtime-123.js";',
    'https://accessrevamp.com/assets/index-456.js',
  );
  assert.deepEqual(urls, ['https://accessrevamp.com/assets/auth-runtime-123.js']);
});
