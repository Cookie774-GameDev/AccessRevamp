import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const webhook = await readFile('netlify/functions/stripe-webhook.mjs', 'utf8');
const migration = await readFile('supabase/migrations/202607170001_accessrevamp.sql', 'utf8');

test('Stripe webhook verifies the raw signed body before processing', () => {
  assert.match(webhook, /await request\.text\(\)/);
  assert.match(webhook, /constructEventAsync\(\s*rawBody,\s*signature/);
});

test('duplicate unprocessed Stripe events are retried instead of discarded', () => {
  assert.match(webhook, /select\('status,processed_at'\)/);
  assert.match(webhook, /existingEvent\?\.processed_at/);
  assert.match(webhook, /update\(\{ status: 'processing', error_message: null \}\)/);
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
  assert.match(webhook, /from\('ar_orders'\)/);
  assert.match(webhook, /payment_status: 'paid'/);
  assert.match(webhook, /rpc\('ar_link_paid_order'/);
  assert.doesNotMatch(webhook, /from\('profiles'\)/);
});

test('catalog amount, currency, and tax are verified before fulfillment', () => {
  assert.match(webhook, /subtotal !== offer\.amount/);
  assert.match(webhook, /tax !== total - subtotal/);
  assert.match(webhook, /currency !== 'usd'/);
  assert.match(webhook, /amount_cents: offer\.amount/);
});

test('paid order linking requires a confirmed matching Auth email', () => {
  assert.match(migration, /u\.email_confirmed_at is not null/);
  assert.match(migration, /lower\(u\.email\) = lower\(v_order\.customer_email\)/);
  assert.match(migration, /v_order\.payment_status <> 'paid'/);
});

test('paid order linker is restricted to the server role', () => {
  assert.match(
    migration,
    /revoke all on function public\.ar_link_paid_order\(uuid\) from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.ar_link_paid_order\(uuid\) to service_role/,
  );
});

test('event completion and failures are persisted', () => {
  assert.match(webhook, /status: finalEventStatus/);
  assert.match(webhook, /processed_at: new Date\(\)\.toISOString\(\)/);
  assert.match(webhook, /status: 'failed'/);
  assert.match(webhook, /if \(processedError\) throw processedError/);
});
