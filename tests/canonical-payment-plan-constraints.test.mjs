import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  'supabase/migrations/20260722020000_canonicalize_payment_plan_constraints.sql',
  'utf8',
);

test('legacy Quick Fix rows fail closed instead of being silently rewritten', () => {
  assert.match(migration, /exists \(select 1 from public\.orders where plan_key = 'quick_fix'\)/);
  assert.match(migration, /Legacy quick_fix records require an explicit data migration/);
});

test('stale order constraints are replaced by the canonical paid catalog', () => {
  assert.match(migration, /drop constraint if exists orders_check/);
  assert.match(migration, /drop constraint if exists orders_plan_key_check/);
  assert.match(migration, /drop constraint if exists orders_amount_total_check/);
  assert.match(migration, /plan_key in \('homepage_reveal','complete_revamp','cinematic_scroll'\)/);
  assert.doesNotMatch(
    migration.replace(/where plan_key = 'quick_fix'/g, ''),
    /quick_fix/,
  );
});

test('full-price and cumulative-credit totals are constrained by plan', () => {
  assert.match(migration, /plan_key = 'homepage_reveal' and amount_total = 5000/);
  assert.match(migration, /plan_key = 'complete_revamp' and amount_total = 20000/);
  assert.match(migration, /plan_key = 'cinematic_scroll' and amount_total = 25000/);
  assert.match(migration, /plan_key = 'homepage_reveal' and credit_cents = 0/);
  assert.match(migration, /plan_key = 'complete_revamp' and credit_cents = any \(array\[0,5000\]\)/);
  assert.match(migration, /plan_key = 'cinematic_scroll' and credit_cents = any \(array\[0,5000,20000\]\)/);
  assert.match(migration, /net_cents = gross_cents - credit_cents/);
  assert.match(migration, /amount_total = net_cents/);
  assert.match(migration, /checkout_request_id is not null/);
  assert.match(migration, /stripe_price_id ~ '\^price_/);
});

test('customer projects reject the retired plan key', () => {
  assert.match(migration, /drop constraint if exists customer_projects_plan_key_check/);
  assert.match(migration, /customer_projects[\s\S]*plan_key in \('homepage_reveal','complete_revamp','cinematic_scroll'\)/);
});
