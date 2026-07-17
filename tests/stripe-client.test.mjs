import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const client = await readFile('netlify/functions/_shared/stripe-client.mjs', 'utf8');
const checkout = await readFile('netlify/functions/create-checkout.mjs', 'utf8');
const webhook = await readFile('netlify/functions/stripe-webhook.mjs', 'utf8');
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const netlifyEnv = await readFile('.env.netlify.example', 'utf8');

test('Stripe SDK and public dependencies are pinned exactly', () => {
  assert.equal(packageJson.dependencies.stripe, '22.3.2');
  for (const version of [
    ...Object.values(packageJson.dependencies),
    ...Object.values(packageJson.devDependencies),
  ]) {
    assert.doesNotMatch(version, /^[~^><=*]/);
  }
});

test('Stripe client pins the June 2026 API and network retry policy', () => {
  assert.match(client, /2026-06-24\.dahlia/);
  assert.match(client, /maxNetworkRetries:\s*2/);
  assert.match(client, /accessrevamp_web_[a-z]{8}/);
});

test('Checkout uses hosted dynamic payment methods and integration tracking', () => {
  assert.match(checkout, /integration_identifier:\s*STRIPE_INTEGRATION_IDENTIFIER/);
  assert.match(checkout, /mode:\s*'payment'/);
  assert.doesNotMatch(checkout, /payment_method_types/);
});

test('webhook deployment mode must be explicit and match the signed event', () => {
  assert.match(webhook, /STRIPE_EXPECTED_LIVEMODE/);
  assert.match(webhook, /event\.livemode !== expectedLivemode\(\)/);
  assert.match(webhook, /MAX_WEBHOOK_BYTES/);
  assert.match(netlifyEnv, /STRIPE_EXPECTED_LIVEMODE=false/);
});
