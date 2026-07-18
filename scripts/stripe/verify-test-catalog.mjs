import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';
import { assertTestModeEnvironment, catalogDefinition } from './sync-test-catalog.mjs';

const STRIPE_API_VERSION = '2026-06-24.dahlia';
const definitions = Object.values(catalogDefinition);

function safeWrite(message) {
  process.stdout.write(`${message}\n`);
}

function safeFailure(error) {
  const label = String(error?.type || error?.name || 'operation_error')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 80);
  process.stderr.write(`Stripe test catalog verification failed (${label || 'operation_error'}).\n`);
}

function productIdentifier(product) {
  return typeof product === 'string' ? product : product?.id;
}

async function listExpectedPrices(stripe) {
  const prices = [];
  let startingAfter;
  do {
    const page = await stripe.prices.list({
      lookup_keys: definitions.map((definition) => definition.lookupKey),
      limit: 100,
      expand: ['data.product'],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    prices.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data.at(-1).id;
  } while (startingAfter);
  return prices;
}

export async function verifyTestCatalog(stripe, env = process.env, write = safeWrite) {
  const prices = await listExpectedPrices(stripe);
  const byLookupKey = new Map(prices.map((price) => [price.lookup_key, price]));
  const environment = {};

  for (const definition of definitions) {
    const price = byLookupKey.get(definition.lookupKey);
    const product = price?.product;
    if (!price
      || price.livemode !== false
      || !price.active
      || price.type !== 'one_time'
      || price.recurring != null
      || price.currency !== definition.currency
      || price.unit_amount !== definition.unitAmount
      || !productIdentifier(product)
      || typeof product === 'string'
      || product.livemode !== false
      || product.active !== true
      || product.name !== definition.productName) {
      throw new Error(`Stripe test catalog definition is missing or invalid: ${definition.lookupKey}.`);
    }

    const supplied = String(env[definition.environmentName] || '').trim();
    const state = !supplied ? 'missing' : supplied === price.id ? 'configured' : 'mismatch';
    environment[definition.environmentName] = state;
    write(`${definition.productName} | ${definition.unitAmount} cents | mode=test | ${definition.environmentName}=${state}`);
  }
  return { environment };
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    safeWrite('unmet prerequisite: missing environment variable STRIPE_SECRET_KEY');
    process.exitCode = 2;
    return;
  }
  try {
    const key = assertTestModeEnvironment(process.env);
    const stripe = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: 2,
      appInfo: { name: 'AccessRevamp catalog verifier', version: '1.0.0' },
    });
    const result = await verifyTestCatalog(stripe, process.env);
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
