import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');
const [
  packageText,
  main,
  checkoutClient,
  orderWizard,
  checkoutFunction,
  paymentRuntime,
  webhook,
  scanner,
  previewFunction,
  previewScript,
  migration,
  importer,
  netlify,
] = await Promise.all([
  read('package.json'),
  read('src/main.js'),
  read('src/services/checkout.js'),
  read('src/services/order-wizard.js'),
  read('netlify/functions/create-checkout.mjs'),
  read('netlify/functions/_shared/payment-runtime.mjs'),
  read('netlify/functions/stripe-webhook.mjs'),
  read('scripts/scan-public-homepage.mjs'),
  read('netlify/functions/private-preview.mjs'),
  read('scripts/create-private-preview.mjs'),
  read('supabase/migrations/202607170005_complete_review_and_preview_model.sql'),
  read('scripts/import-reviewed-prospects.mjs'),
  read('netlify.toml'),
]);
const packageJson = JSON.parse(packageText);

test('runtime and security-sensitive dependencies are exact and current for the release', () => {
  assert.equal(packageJson.engines.node, '>=22.12.0');
  assert.equal(packageJson.dependencies.stripe, '22.3.2');
  assert.equal(packageJson.dependencies['@supabase/supabase-js'], '2.110.7');
  assert.equal(packageJson.dependencies.playwright, '1.61.1');
  assert.equal(packageJson.dependencies['@axe-core/playwright'], '4.12.1');
  assert.equal(packageJson.dependencies.zod, '3.25.76');
  assert.equal(packageJson.devDependencies.vite, '8.1.5');
  for (const version of [...Object.values(packageJson.dependencies), ...Object.values(packageJson.devDependencies)]) {
    assert.doesNotMatch(version, /^[~^]/, 'production dependency versions must be exact');
  }
});

test('pricing buttons save one stable request and use only server-created Checkout', () => {
  assert.match(main, /setupCheckout/);
  assert.match(checkoutClient, /\/api\/order-draft/);
  assert.match(checkoutClient, /\/api\/create-checkout/);
  assert.match(orderWizard, /crypto\.randomUUID\(\)/);
  assert.match(orderWizard, /form\.dataset\.orderRequestId/);
  assert.ok(checkoutClient.indexOf('fetch(ORDER_DRAFT_ENDPOINT') < checkoutClient.indexOf('fetch(CHECKOUT_ENDPOINT'));
  assert.match(checkoutClient, /checkout\.stripe\.com/);
  assert.doesNotMatch(checkoutClient, /book\.stripe\.com|payment[_-]?link/i);
});

test('Checkout uses explicit API version, idempotency, a fail-closed database catalog, and exact metadata', () => {
  assert.match(checkoutFunction, /2026-06-24\.dahlia/);
  assert.match(checkoutFunction, /idempotencyKey: `accessrevamp_checkout_/);
  assert.match(checkoutFunction, /resolveCatalogPrice/);
  assert.match(checkoutFunction, /requireLiveCheckoutRuntime/);
  assert.match(checkoutFunction, /requireRuntime = requireLiveCheckoutRuntime/);
  assert.match(checkoutFunction, /\.from\('order_drafts'\)/);
  assert.match(checkoutFunction, /buildCheckoutMetadata/);
  assert.match(checkoutFunction, /STRIPE_CHECKOUT_SECRET_KEY/);
  assert.match(paymentRuntime, /stripe_price_catalog/);
  assert.match(paymentRuntime, /configuration_verified_at/);
  assert.doesNotMatch(checkoutFunction, /price_1T|STRIPE_QUICK_FIX/);
  assert.doesNotMatch(checkoutFunction, /payment_method_types/);
  assert.doesNotMatch(checkoutFunction, /automatic_tax:\s*\{\s*enabled:\s*true/);
});

test('webhook re-retrieves Checkout and validates the exact database-authoritative Stripe price', () => {
  assert.match(webhook, /checkout\.sessions\.retrieve/);
  assert.match(webhook, /line_items\.data\.price/);
  assert.match(webhook, /identifier\(lineItem\.price\) !== expectedPriceId/);
  assert.match(webhook, /resolveCatalogPrice/);
  assert.match(webhook, /STRIPE_WEBHOOK_READ_SECRET_KEY/);
  assert.match(webhook, /constructEventAsync/);
  assert.doesNotMatch(webhook, /price_1T|STRIPE_QUICK_FIX/);
  assert.match(webhook, /session\.mode !== 'payment'/);
  assert.match(webhook, /expectedLivemode/);
});

test('scanner is passive and refuses private or state-changing traffic', () => {
  assert.match(scanner, /candidate_needs_human_review/);
  assert.match(scanner, /\['GET', 'HEAD'\]/);
  assert.match(scanner, /Blocked private or reserved address/);
  assert.match(scanner, /serviceWorkers: 'block'/);
  assert.match(scanner, /acceptDownloads: false/);
  assert.doesNotMatch(scanner, /\.(?:click|type|press)\(/);
  assert.doesNotMatch(scanner, /\b(?:page|locator|elementHandle)\.fill\(/);
});

test('private previews store only a hash, expire, and send noindex controls', () => {
  assert.match(previewScript, /createHash\('sha256'\)/);
  assert.match(previewScript, /randomBytes\(32\)/);
  assert.doesNotMatch(previewScript, /token:\s*token/);
  assert.match(previewFunction, /x-robots-tag/);
  assert.match(previewFunction, /noindex, nofollow, noarchive, nosnippet/);
  assert.match(previewFunction, /Private preview — not for public distribution/);
  assert.match(previewFunction, /expiresAt <= new Date\(\)/);
  assert.match(netlify, /from = "\/preview\/:token"/);
});

test('review migration contains structured findings, evidence, private previews, and browser-role denial', () => {
  for (const column of [
    'severity',
    'confidence',
    'affected_user_group',
    'affected_business_task',
    'wcag_reference',
    'repair_effort',
    'proposed_fix',
    'retest_result',
  ]) assert.match(migration, new RegExp(`\\b${column}\\b`));
  assert.match(migration, /create table if not exists public\.finding_evidence/);
  assert.match(migration, /create table if not exists public\.previews/);
  assert.match(migration, /revoke all on table public\.finding_evidence, public\.previews from public, anon, authenticated/);
  assert.match(migration, /grant all on table public\.finding_evidence, public\.previews to service_role/);
});

test('reviewed-prospect import uses severity and rejects security scare claims', () => {
  assert.match(importer, /severity: z\.enum/);
  assert.match(importer, /affectedUserGroup/);
  assert.match(importer, /affectedBusinessTask/);
  assert.match(importer, /confidence: 'verified'/);
  assert.match(importer, /scareClaimPattern/);
  assert.match(importer, /URL shorteners are not allowed/);
  assert.doesNotMatch(importer, /'security_hygiene'/);
});
