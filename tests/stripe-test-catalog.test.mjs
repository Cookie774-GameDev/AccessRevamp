import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const syncPath = 'scripts/stripe/sync-test-catalog.mjs';
const verifyPath = 'scripts/stripe/verify-test-catalog.mjs';

const expectedCatalog = Object.freeze({
  homepage_reveal_full: ['Homepage Reveal', 5000, 'STRIPE_HOMEPAGE_REVEAL_FULL_PRICE_ID'],
  complete_revamp_full: ['Complete Website Revamp', 20000, 'STRIPE_COMPLETE_REVAMP_FULL_PRICE_ID'],
  cinematic_scroll_full: ['Cinematic Scroll Site', 25000, 'STRIPE_CINEMATIC_FULL_PRICE_ID'],
  homepage_to_complete: ['Complete Website Revamp', 15000, 'STRIPE_HOMEPAGE_TO_COMPLETE_PRICE_ID'],
  homepage_to_cinematic: ['Cinematic Scroll Site', 20000, 'STRIPE_HOMEPAGE_TO_CINEMATIC_PRICE_ID'],
  complete_to_cinematic: ['Cinematic Scroll Site', 5000, 'STRIPE_COMPLETE_TO_CINEMATIC_PRICE_ID'],
});

test('Stripe test catalog defines the six exact one-time USD transitions', async () => {
  const { catalogDefinition } = await import('../scripts/stripe/sync-test-catalog.mjs');

  assert.deepEqual(Object.keys(catalogDefinition), Object.keys(expectedCatalog));
  for (const [key, [productName, unitAmount, environmentName]] of Object.entries(expectedCatalog)) {
    assert.deepEqual(
      {
        productName: catalogDefinition[key].productName,
        unitAmount: catalogDefinition[key].unitAmount,
        currency: catalogDefinition[key].currency,
        environmentName: catalogDefinition[key].environmentName,
      },
      { productName, unitAmount, currency: 'usd', environmentName },
    );
    assert.match(catalogDefinition[key].lookupKey, /^accessrevamp_[a-z_]+_v1$/);
    assert.equal(catalogDefinition[key].recurring, undefined);
  }
});

test('Stripe catalog tools reject every credential except an explicit test secret', async () => {
  const { assertTestSecretKey } = await import('../scripts/stripe/sync-test-catalog.mjs');

  assert.equal(assertTestSecretKey('sk_test_example'), 'sk_test_example');
  for (const unsafe of ['', 'pk_test_example', 'rk_test_example', 'not-a-key', 'sk_test']) {
    assert.throws(() => assertTestSecretKey(unsafe), /test Stripe secret key/i);
  }

  const sources = await Promise.all([syncPath, verifyPath].map((path) => readFile(path, 'utf8')));
  assert.match(sources[0], /startsWith\(['"]sk_test_['"]\)/);
  assert.doesNotMatch(sources.join('\n'), /sk_live_|livemode\s*:\s*true/i);
  assert.doesNotMatch(sources.join('\n'), /console\.(?:log|error|warn|dir)/i);
  assert.doesNotMatch(sources.join('\n'), /process\.stdout\.write\([^)]*(?:\.id|secret|key\))/i);
});

test('synchronizer is idempotent and archives only managed legacy pricing after open-session review', async () => {
  const source = await readFile(syncPath, 'utf8');

  for (const operation of [
    /stripe\.products\.list/i,
    /stripe\.products\.create/i,
    /stripe\.products\.update/i,
    /stripe\.prices\.list/i,
    /stripe\.prices\.create/i,
    /stripe\.checkout\.sessions\.list/i,
    /stripe\.prices\.update\([^;]+active\s*:\s*false/i,
  ]) assert.match(source, operation);

  assert.match(source, /unit_amount\s*===?\s*19900/i);
  assert.match(source, /accessrevamp_managed|accessrevamp_integration/i);
  assert.match(source, /sessionUsesPrice[\s\S]*checkout\.sessions\.list[\s\S]*prices\.update/i);
  assert.match(source, /lookup_keys/i);
  assert.match(source, /products\.create\([\s\S]*idempotencyKey/i);
  assert.match(source, /prices\.create\([\s\S]*idempotencyKey/i);
  assert.doesNotMatch(source, /products\.del|prices\.del/i);
});

test('verifier checks test mode, exact active price shape, and server environment mapping', async () => {
  const source = await readFile(verifyPath, 'utf8');

  assert.match(source, /livemode\s*!==\s*false/i);
  assert.match(source, /price\.active/i);
  assert.match(source, /price\.currency[\s\S]*definition\.currency/i);
  assert.match(source, /price\.unit_amount[\s\S]*definition\.unitAmount/i);
  assert.match(source, /definition\.environmentName/i);

  const result = spawnSync(process.execPath, [verifyPath], {
    cwd: process.cwd(),
    env: Object.fromEntries(Object.entries(process.env).filter(([name]) => name !== 'STRIPE_SECRET_KEY')),
    encoding: 'utf8',
  });
  assert.equal(result.status, 2);
  assert.match(result.stdout, /STRIPE_SECRET_KEY/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /sk_[A-Za-z0-9_]+|price_[A-Za-z0-9_]+|prod_[A-Za-z0-9_]+/);
});

test('synchronizer reuses the exact catalog, ignores unrelated objects, and redacts output', async () => {
  const { catalogDefinition, syncTestCatalog } = await import('../scripts/stripe/sync-test-catalog.mjs');
  const productByKey = new Map([
    ['homepage_reveal', { id: 'product-home', name: 'Homepage Reveal' }],
    ['complete_revamp', { id: 'product-complete', name: 'Complete Website Revamp' }],
    ['cinematic_scroll', { id: 'product-cinematic', name: 'Cinematic Scroll Site' }],
  ]);
  const products = [...productByKey].map(([key, product]) => ({
    ...product,
    active: true,
    livemode: false,
    metadata: {
      accessrevamp_integration: 'accessrevamp',
      accessrevamp_managed: 'true',
      accessrevamp_tier_key: key,
    },
  }));
  const expectedPrices = Object.values(catalogDefinition).map((definition, index) => ({
    id: `catalog-price-${index}`,
    lookup_key: definition.lookupKey,
    unit_amount: definition.unitAmount,
    currency: definition.currency,
    active: true,
    livemode: false,
    type: 'one_time',
    recurring: null,
    product: productByKey.get(definition.productKey).id,
  }));
  const managedProduct = products[1];
  const managedLegacy = {
    id: 'managed-legacy-price',
    lookup_key: null,
    unit_amount: 19900,
    currency: 'usd',
    active: true,
    livemode: false,
    type: 'one_time',
    recurring: null,
    product: managedProduct,
  };
  const unrelatedLegacy = {
    ...managedLegacy,
    id: 'unrelated-legacy-price',
    product: { id: 'unrelated-product', metadata: {} },
  };
  const calls = { productCreate: 0, productUpdate: 0, priceCreate: 0, priceUpdates: [] };
  const stripe = {
    products: {
      list: async () => ({ data: products, has_more: false }),
      create: async () => { calls.productCreate += 1; },
      update: async () => { calls.productUpdate += 1; },
    },
    prices: {
      list: async (params) => ({
        data: params.lookup_keys ? expectedPrices : [managedLegacy, unrelatedLegacy],
        has_more: false,
      }),
      create: async () => { calls.priceCreate += 1; },
      update: async (identifier, payload) => { calls.priceUpdates.push([identifier, payload]); },
    },
    checkout: {
      sessions: { list: async () => ({ data: [], has_more: false }) },
    },
  };
  const env = Object.fromEntries(Object.values(catalogDefinition).map((definition, index) => (
    [definition.environmentName, `catalog-price-${index}`]
  )));
  const output = [];

  const result = await syncTestCatalog(stripe, env, (line) => output.push(line));

  assert.deepEqual(calls, {
    productCreate: 0,
    productUpdate: 0,
    priceCreate: 0,
    priceUpdates: [['managed-legacy-price', { active: false }]],
  });
  assert.deepEqual(result.legacy, { archived: 1, retained: 0 });
  assert.ok(Object.values(result.environment).every((state) => state === 'configured'));
  assert.doesNotMatch(output.join('\n'), /catalog-price-|managed-legacy-price|unrelated-/);
});

test('legacy price review recognizes both expanded and compact open-session line items', async () => {
  const { sessionUsesPrice } = await import('../scripts/stripe/sync-test-catalog.mjs');

  assert.equal(sessionUsesPrice({ line_items: { data: [{ price: 'legacy-price' }] } }, 'legacy-price'), true);
  assert.equal(sessionUsesPrice({ line_items: { data: [{ price: { id: 'legacy-price' } }] } }, 'legacy-price'), true);
  assert.equal(sessionUsesPrice({ line_items: { data: [{ price: 'different-price' }] } }, 'legacy-price'), false);
  assert.equal(sessionUsesPrice({}, 'legacy-price'), false);
});
