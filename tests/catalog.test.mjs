import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
  TIERS,
  TIER_KEYS,
  getEligibleCreditCents,
  getTier,
  quoteUpgrade,
} from '../src/config/tier-catalog.js';
import { getStripePriceForQuote } from '../netlify/functions/_shared/stripe-catalog.mjs';

test('catalog exposes the exact canonical one-time tiers', () => {
  assert.deepEqual(TIER_KEYS, ['free_snapshot', 'homepage_reveal', 'complete_revamp', 'cinematic_scroll']);
  assert.deepEqual(
    TIER_KEYS.map((key) => [getTier(key).name, getTier(key).listPriceCents, getTier(key).cadence]),
    [
      ['Free Snapshot', 0, 'one-time'],
      ['Homepage Reveal', 5000, 'one-time'],
      ['Complete Website Revamp', 20000, 'one-time'],
      ['Cinematic Scroll Site', 25000, 'one-time'],
    ],
  );
  assert.equal(TIERS.complete_revamp.rank, 2);
  assert.ok(TIERS.complete_revamp.features.includes('15 Canva-built animated poster ads total across the package'));
  assert.equal(TIERS.complete_revamp.features.some((feature) => /still poster/i.test(feature)), false);
  assert.equal(Object.isFrozen(TIERS), true);
});

test('upgrade quotes use exact cumulative credit arithmetic', () => {
  const transitions = [
    [0, 'homepage_reveal', 5000],
    [0, 'complete_revamp', 20000],
    [0, 'cinematic_scroll', 25000],
    [5000, 'complete_revamp', 15000],
    [5000, 'cinematic_scroll', 20000],
    [20000, 'cinematic_scroll', 5000],
    [25000, 'cinematic_scroll', 0],
  ];

  for (const [paidCents, targetKey, dueNowCents] of transitions) {
    const quote = quoteUpgrade(paidCents, targetKey);
    assert.equal(quote.dueNowCents, dueNowCents, `${paidCents} -> ${targetKey}`);
    assert.equal(quote.verifiedCreditCents, Math.min(paidCents, quote.listPriceCents));
    assert.equal(quote.resultingEntitlement, targetKey);
  }
  assert.equal(getEligibleCreditCents(5000, 'complete_revamp'), 5000);
  assert.equal(getEligibleCreditCents(25000, 'cinematic_scroll'), 25000);
});

test('upgrade quotes reject unsafe or incoherent inputs', () => {
  assert.throws(() => getTier('unknown'), /Unknown tier/);
  assert.throws(() => quoteUpgrade(-1, 'homepage_reveal'), /nonnegative/);
  assert.throws(() => quoteUpgrade(25001, 'cinematic_scroll'), /25000/);
  assert.throws(() => quoteUpgrade(20000, 'homepage_reveal'), /downgrade/i);
  assert.throws(() => quoteUpgrade(25000, 'complete_revamp'), /downgrade/i);
});

test('server adapter selects only the environment mapping for the verified transition', () => {
  const quote = quoteUpgrade(5000, 'complete_revamp');
  const env = { STRIPE_HOMEPAGE_TO_COMPLETE_PRICE_ID: 'price_test_homepage_to_complete' };
  assert.deepEqual(getStripePriceForQuote(quote, env), {
    priceId: 'price_test_homepage_to_complete',
    transitionKey: 'homepage_reveal->complete_revamp',
  });
  assert.throws(() => getStripePriceForQuote(quote, {}), /STRIPE_HOMEPAGE_TO_COMPLETE_PRICE_ID/);
  assert.throws(
    () => getStripePriceForQuote(quoteUpgrade(25000, 'cinematic_scroll'), env),
    /No Stripe payment is due/,
  );
});

test('browser configuration contains no Stripe identifiers or legacy catalog', async () => {
  const source = await readFile('src/config.js', 'utf8');
  assert.doesNotMatch(source, /price_|book\.stripe\.com|VITE_STRIPE|\$199|quick_fix/i);
});

test('the complete browser source has no direct Stripe or legacy catalog path', async () => {
  const sources = [];
  async function collect(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const target = join(path, entry.name);
      if (entry.isDirectory()) await collect(target);
      else if (entry.name.endsWith('.js')) sources.push(await readFile(target, 'utf8'));
    }
  }
  await collect('src');
  assert.doesNotMatch(sources.join('\n'), /price_|book\.stripe\.com|VITE_STRIPE|\$199|quick_fix/i);
});
