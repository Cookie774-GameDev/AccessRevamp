import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';

const STRIPE_API_VERSION = '2026-06-24.dahlia';
const INTEGRATION = 'accessrevamp';

export const catalogDefinition = Object.freeze({
  homepage_reveal_full: Object.freeze({
    productKey: 'homepage_reveal',
    productName: 'Homepage Reveal',
    unitAmount: 5000,
    currency: 'usd',
    lookupKey: 'accessrevamp_homepage_reveal_full_v1',
    environmentName: 'STRIPE_HOMEPAGE_REVEAL_FULL_PRICE_ID',
  }),
  complete_revamp_full: Object.freeze({
    productKey: 'complete_revamp',
    productName: 'Complete Website Revamp',
    unitAmount: 20000,
    currency: 'usd',
    lookupKey: 'accessrevamp_complete_revamp_full_v1',
    environmentName: 'STRIPE_COMPLETE_REVAMP_FULL_PRICE_ID',
  }),
  cinematic_scroll_full: Object.freeze({
    productKey: 'cinematic_scroll',
    productName: 'Cinematic Scroll Site',
    unitAmount: 25000,
    currency: 'usd',
    lookupKey: 'accessrevamp_cinematic_scroll_full_v1',
    environmentName: 'STRIPE_CINEMATIC_FULL_PRICE_ID',
  }),
  homepage_to_complete: Object.freeze({
    productKey: 'complete_revamp',
    productName: 'Complete Website Revamp',
    unitAmount: 15000,
    currency: 'usd',
    lookupKey: 'accessrevamp_homepage_to_complete_v1',
    environmentName: 'STRIPE_HOMEPAGE_TO_COMPLETE_PRICE_ID',
  }),
  homepage_to_cinematic: Object.freeze({
    productKey: 'cinematic_scroll',
    productName: 'Cinematic Scroll Site',
    unitAmount: 20000,
    currency: 'usd',
    lookupKey: 'accessrevamp_homepage_to_cinematic_v1',
    environmentName: 'STRIPE_HOMEPAGE_TO_CINEMATIC_PRICE_ID',
  }),
  complete_to_cinematic: Object.freeze({
    productKey: 'cinematic_scroll',
    productName: 'Cinematic Scroll Site',
    unitAmount: 5000,
    currency: 'usd',
    lookupKey: 'accessrevamp_complete_to_cinematic_v1',
    environmentName: 'STRIPE_COMPLETE_TO_CINEMATIC_PRICE_ID',
  }),
});

const definitions = Object.values(catalogDefinition);
const productDefinitions = [...new Map(
  definitions.map((definition) => [definition.productKey, definition]),
).values()];

function safeWrite(message) {
  process.stdout.write(`${message}\n`);
}

function safeFailure(error) {
  const label = String(error?.type || error?.name || 'operation_error')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 80);
  process.stderr.write(`Stripe test catalog operation failed (${label || 'operation_error'}).\n`);
}

export function assertTestSecretKey(value) {
  const key = String(value || '').trim();
  if (!key.startsWith('sk_test_') || key.length <= 'sk_test_'.length) {
    throw new Error('An explicit test Stripe secret key is required.');
  }
  return key;
}

export function assertTestModeEnvironment(env = process.env) {
  const key = assertTestSecretKey(env.STRIPE_SECRET_KEY);
  if (env.STRIPE_EXPECT_LIVEMODE && env.STRIPE_EXPECT_LIVEMODE !== 'false') {
    throw new Error('STRIPE_EXPECT_LIVEMODE must remain false for catalog tools.');
  }
  return key;
}

function createStripeClient(key) {
  return new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    appInfo: { name: 'AccessRevamp catalog tools', version: '1.0.0' },
  });
}

async function listAll(fetchPage) {
  const rows = [];
  let startingAfter;
  do {
    const page = await fetchPage(startingAfter);
    rows.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data.at(-1).id;
  } while (startingAfter);
  return rows;
}

function isManagedProduct(product) {
  return product
    && typeof product !== 'string'
    && product.metadata?.accessrevamp_integration === INTEGRATION
    && product.metadata?.accessrevamp_managed === 'true';
}

async function ensureProducts(stripe) {
  const existing = await listAll((startingAfter) => stripe.products.list({
    limit: 100,
    ...(startingAfter ? { starting_after: startingAfter } : {}),
  }));
  const byKey = new Map();

  for (const definition of productDefinitions) {
    const matches = existing.filter((product) => (
      isManagedProduct(product)
      && product.metadata.accessrevamp_tier_key === definition.productKey
    ));
    if (matches.length > 1) {
      throw new Error(`Multiple managed Stripe test products exist for ${definition.productKey}.`);
    }

    let product = matches[0];
    if (!product) {
      product = await stripe.products.create(
        {
          name: definition.productName,
          active: true,
          metadata: {
            accessrevamp_integration: INTEGRATION,
            accessrevamp_managed: 'true',
            accessrevamp_tier_key: definition.productKey,
          },
        },
        { idempotencyKey: `accessrevamp_test_product_${definition.productKey}_v1` },
      );
    } else if (!product.active || product.name !== definition.productName) {
      product = await stripe.products.update(product.id, {
        name: definition.productName,
        active: true,
        metadata: {
          accessrevamp_integration: INTEGRATION,
          accessrevamp_managed: 'true',
          accessrevamp_tier_key: definition.productKey,
        },
      });
    }
    if (product.livemode !== false) throw new Error('Managed product is not in Stripe test mode.');
    byKey.set(definition.productKey, product);
  }
  return byKey;
}

function productIdentifier(product) {
  return typeof product === 'string' ? product : product?.id;
}

function priceMatchesDefinition(price, definition, product) {
  return price
    && price.livemode === false
    && price.active === true
    && price.type === 'one_time'
    && price.recurring == null
    && price.currency === definition.currency
    && price.unit_amount === definition.unitAmount
    && productIdentifier(price.product) === product.id;
}

async function ensurePrices(stripe, products) {
  const lookupKeys = definitions.map((definition) => definition.lookupKey);
  const existing = await listAll((startingAfter) => stripe.prices.list({
    lookup_keys: lookupKeys,
    limit: 100,
    expand: ['data.product'],
    ...(startingAfter ? { starting_after: startingAfter } : {}),
  }));
  const byLookupKey = new Map(existing.map((price) => [price.lookup_key, price]));
  const configured = new Map();

  for (const definition of definitions) {
    const product = products.get(definition.productKey);
    let price = byLookupKey.get(definition.lookupKey);
    if (price && !priceMatchesDefinition(price, definition, product)) {
      throw new Error(`Managed Stripe lookup key has an unexpected shape: ${definition.lookupKey}.`);
    }
    if (!price) {
      price = await stripe.prices.create(
        {
          product: product.id,
          currency: definition.currency,
          unit_amount: definition.unitAmount,
          lookup_key: definition.lookupKey,
          nickname: `AccessRevamp ${definition.productName}`,
          metadata: {
            accessrevamp_integration: INTEGRATION,
            accessrevamp_managed: 'true',
            accessrevamp_transition: definition.lookupKey,
          },
        },
        { idempotencyKey: `accessrevamp_test_price_${definition.lookupKey}` },
      );
    }
    if (!priceMatchesDefinition(price, definition, product)) {
      throw new Error(`Created Stripe test price failed verification: ${definition.lookupKey}.`);
    }
    configured.set(definition.lookupKey, price);
  }
  return configured;
}

export function sessionUsesPrice(session, priceIdentifier) {
  return (session.line_items?.data || []).some((lineItem) => (
    productIdentifier(lineItem.price) === priceIdentifier
  ));
}

async function archiveManagedLegacyPrices(stripe, write = safeWrite) {
  const prices = await listAll((startingAfter) => stripe.prices.list({
    active: true,
    currency: 'usd',
    type: 'one_time',
    limit: 100,
    expand: ['data.product'],
    ...(startingAfter ? { starting_after: startingAfter } : {}),
  }));
  const stale = prices.filter((price) => (
    price.livemode === false
    && price.unit_amount === 19900
    && isManagedProduct(price.product)
  ));
  if (stale.length === 0) return { archived: 0, retained: 0 };

  const sessions = await listAll((startingAfter) => stripe.checkout.sessions.list({
    status: 'open',
    limit: 100,
    expand: ['data.line_items'],
    ...(startingAfter ? { starting_after: startingAfter } : {}),
  }));
  let archived = 0;
  let retained = 0;

  for (const price of stale) {
    if (sessions.some((session) => sessionUsesPrice(session, price.id))) {
      retained += 1;
      write('legacy AccessRevamp $199 test price: retained (open Checkout Session)');
      continue;
    }
    await stripe.prices.update(price.id, { active: false });
    archived += 1;
    write('legacy AccessRevamp $199 test price: archived');
  }
  return { archived, retained };
}

function describeEnvironment(definition, price, env) {
  const supplied = String(env[definition.environmentName] || '').trim();
  if (!supplied) return 'missing';
  return supplied === price.id ? 'configured' : 'mismatch';
}

export async function syncTestCatalog(stripe, env = process.env, write = safeWrite) {
  const products = await ensureProducts(stripe);
  const prices = await ensurePrices(stripe, products);
  const environment = {};

  for (const definition of definitions) {
    const state = describeEnvironment(definition, prices.get(definition.lookupKey), env);
    environment[definition.environmentName] = state;
    write(`${definition.productName} | ${definition.unitAmount} cents | mode=test | ${definition.environmentName}=${state}`);
  }
  const legacy = await archiveManagedLegacyPrices(stripe, write);
  return { environment, legacy };
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    safeWrite('unmet prerequisite: missing environment variable STRIPE_SECRET_KEY');
    process.exitCode = 2;
    return;
  }
  try {
    const key = assertTestModeEnvironment(process.env);
    const result = await syncTestCatalog(createStripeClient(key), process.env);
    if (Object.values(result.environment).some((state) => state !== 'configured')) {
      process.exitCode = 2;
    }
  } catch (error) {
    safeFailure(error);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
