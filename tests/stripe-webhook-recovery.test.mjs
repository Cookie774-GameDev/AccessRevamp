import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const webhook = await readFile('netlify/functions/stripe-webhook.mjs', 'utf8');
const fulfillmentMigration = await readFile(
  'supabase/migrations/202607170004_harden_payment_fulfillment.sql',
  'utf8',
);

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
  assert.match(webhook, /const shouldFulfill =/);
  assert.match(webhook, /session\.payment_status === 'paid'/);
});

test('orders and projects are fulfilled only after confirmed payment', () => {
  assert.match(webhook, /if \(shouldFulfill\)/);
  assert.match(webhook, /status: 'paid'/);
  assert.match(webhook, /rpc\('link_accessrevamp_paid_order'/);
  assert.doesNotMatch(webhook, /from\('profiles'\)/);
});

test('catalog amount and currency are verified before fulfillment', () => {
  assert.match(webhook, /expectedAmount !== amount/);
  assert.match(webhook, /quoteUpgrade\(0, planKey\)/);
  assert.match(webhook, /currency !== 'usd'/);
});

test('paid order linking requires a confirmed matching Auth email', () => {
  assert.match(fulfillmentMigration, /users\.email_confirmed_at is not null/);
  assert.match(fulfillmentMigration, /lower\(users\.email\) = lower\(v_order\.customer_email\)/);
  assert.match(fulfillmentMigration, /v_order\.status <> 'paid'/);
});

test('paid order linker is restricted to the server role', () => {
  assert.match(
    fulfillmentMigration,
    /revoke all on function public\.link_accessrevamp_paid_order\(uuid\) from public, anon, authenticated/,
  );
  assert.match(
    fulfillmentMigration,
    /grant execute on function public\.link_accessrevamp_paid_order\(uuid\) to service_role/,
  );
});

test('event completion is persisted and checked', () => {
  assert.match(webhook, /update\(\{ processed_at: new Date\(\)\.toISOString\(\) \}\)/);
  assert.match(webhook, /if \(processedError\) throw processedError/);
});
