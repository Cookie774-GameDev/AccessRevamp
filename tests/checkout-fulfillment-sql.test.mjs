import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  'supabase/migrations/20260722030000_fix_checkout_fulfillment_coalesce.sql',
  'utf8',
);
const functionBody = migration.slice(migration.indexOf('as $$'));

test('checkout fulfillment uses valid PostgreSQL COALESCE syntax', () => {
  assert.match(functionBody, /coalesce\(v_reservation\.from_tier_key, 'none'\) <> v_from_tier/);
  assert.doesNotMatch(functionBody, /pg_catalog\.coalesce/);
});

test('fulfillment retains payment identity, amount, and reservation validation', () => {
  assert.match(functionBody, /v_reservation\.checkout_session_id is distinct from v_session_id/);
  assert.match(functionBody, /v_reservation\.stripe_price_id is distinct from v_price_id/);
  assert.match(functionBody, /v_reservation\.idempotency_key <> v_request_id/);
  assert.match(functionBody, /v_reservation\.gross_cents <> v_gross/);
  assert.match(functionBody, /v_reservation\.credit_cents <> v_credit/);
  assert.match(functionBody, /v_reservation\.net_cents <> v_net/);
  assert.match(functionBody, /v_session_created_at > v_reservation\.expires_at/);
});

test('fulfillment remains idempotent and creates all durable customer records', () => {
  assert.match(functionBody, /events\.processed_at/);
  assert.match(functionBody, /return query select v_order_id, v_entitlement_id, v_project_id, true/);
  assert.match(functionBody, /insert into public\.orders/);
  assert.match(functionBody, /insert into public\.entitlements/);
  assert.match(functionBody, /insert into public\.customer_projects/);
  assert.match(functionBody, /on conflict on constraint customer_projects_order_id_key do update/);
  assert.doesNotMatch(functionBody, /on conflict \(order_id\) do update/);
  assert.match(functionBody, /insert into public\.accessrevamp_audit_log/);
  assert.match(functionBody, /update public\.stripe_events[\s\S]*processed_at = pg_catalog\.now\(\)/);
});

test('browser roles cannot invoke payment fulfillment', () => {
  assert.match(migration, /revoke all on function public\.fulfill_accessrevamp_checkout\(jsonb\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.fulfill_accessrevamp_checkout\(jsonb\) to service_role/);
});
