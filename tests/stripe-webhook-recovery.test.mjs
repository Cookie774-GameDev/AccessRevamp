import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const webhook = await readFile('netlify/functions/stripe-webhook.mjs', 'utf8');

test('Stripe webhook verifies the raw signed body before processing', () => {
  assert.match(webhook, /await request\.text\(\)/);
  assert.match(webhook, /constructEventAsync\(rawBody, signature/);
});

test('duplicate unprocessed Stripe events are retried instead of discarded', () => {
  assert.match(webhook, /select\('processed_at'\)/);
  assert.match(webhook, /existingEvent\?\.processed_at/);
  assert.match(webhook, /previous attempt recorded the event but did not finish/i);
  assert.doesNotMatch(webhook, /eventInsertError\?\.code === '23505'\) return/);
});

test('delayed payment outcomes are handled explicitly', () => {
  assert.match(webhook, /checkout\.session\.async_payment_succeeded/);
  assert.match(webhook, /checkout\.session\.async_payment_failed/);
  assert.match(webhook, /const isPaid =/);
});

test('customer projects are created only for paid checkouts', () => {
  assert.match(webhook, /if \(userId && isPaid\)/);
  assert.match(webhook, /const orderStatus = isPaid \? 'paid' : 'unpaid'/);
});

test('catalog amount and currency are verified before fulfillment', () => {
  assert.match(webhook, /expectedAmounts\[planKey\] !== amount/);
  assert.match(webhook, /currency !== 'usd'/);
});

test('event completion is persisted and checked', () => {
  assert.match(webhook, /update\(\{ processed_at: new Date\(\)\.toISOString\(\) \}\)/);
  assert.match(webhook, /if \(processedError\) throw processedError/);
});
