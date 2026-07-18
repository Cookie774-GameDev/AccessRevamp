import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('catalog exposes the three approved one-time amounts', async () => {
  const source = await readFile('src/config.js', 'utf8');
  assert.match(source, /homepage_reveal[\s\S]*amount:\s*5000\b/);
  assert.match(source, /quick_fix[\s\S]*amount:\s*19900\b/);
  assert.match(source, /cinematic_scroll[\s\S]*amount:\s*25000\b/);
  assert.equal((source.match(/cadence:\s*'one-time'/g) || []).length, 3);
  assert.doesNotMatch(source, /recurring|subscription_price/i);
});

test('Stripe identifiers match the configured sandbox catalog', async () => {
  const source = await readFile('src/config.js', 'utf8');
  assert.match(source, /price_1TuGoNLzyGRcyGQJRjtGsiMV/);
  assert.match(source, /price_1TuGoTLzyGRcyGQJfdkqoE3f/);
  assert.match(source, /price_1TuNWjLzyGRcyGQJ5NNWNU88/);
  assert.match(source, /book\.stripe\.com\/test_6oU8wQ7125yo2Ot4CAgQE04/);
});
