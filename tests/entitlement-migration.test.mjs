import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/202607180002_add_tier_entitlements.sql';

test('entitlement migration creates the complete constrained payment model', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  for (const table of ['tier_catalog', 'entitlements', 'upgrade_reservations', 'refund_dependencies']) {
    assert.match(sql, new RegExp(`create table(?: if not exists)? public\\.${table}`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }

  for (const column of ['tier_key', 'rank', 'list_price_cents', 'active', 'stripe_full_price_id']) {
    assert.match(sql, new RegExp(`tier_catalog[\\s\\S]*${column}`, 'i'));
  }
  for (const column of ['user_id', 'highest_tier_key', 'status', 'source_order_id', 'effective_paid_cents']) {
    assert.match(sql, new RegExp(`entitlements[\\s\\S]*${column}`, 'i'));
  }
  for (const column of ['from_tier_key', 'to_tier_key', 'gross_cents', 'credit_cents', 'net_cents', 'stripe_price_id', 'idempotency_key', 'checkout_session_id', 'source_entitlement_id', 'expires_at']) {
    assert.match(sql, new RegExp(`upgrade_reservations[\\s\\S]*${column}`, 'i'));
  }
  for (const column of ['base_order_id', 'dependent_order_id', 'dependency_type', 'status', 'resolved_at', 'resolution']) {
    assert.match(sql, new RegExp(`refund_dependencies[\\s\\S]*${column}`, 'i'));
  }

  assert.match(sql, /free_snapshot[\s\S]*0[\s\S]*homepage_reveal[\s\S]*5000[\s\S]*complete_revamp[\s\S]*20000[\s\S]*cinematic_scroll[\s\S]*25000/i);
  assert.match(sql, /status\s+in\s*\(\s*'active'\s*,\s*'suspended'\s*,\s*'revoked'\s*\)/i);
  assert.match(sql, /'reserved'[\s\S]*'checkout_created'[\s\S]*'paid'[\s\S]*'expired'[\s\S]*'canceled'[\s\S]*'reversed'/i);
  assert.match(sql, /net_cents\s*=\s*gross_cents\s*-\s*credit_cents/i);
  assert.match(sql, /expires_at\s*<=\s*created_at\s*\+\s*interval\s*'30 minutes'/i);
  assert.match(sql, /create unique index[^;]+entitlements[^;]+user_id[^;]+where\s*\(status\s*=\s*'active'\)/i);
  assert.match(sql, /create unique index[^;]+upgrade_reservations[^;]+user_id[^;]+to_tier_key[^;]+where\s*\(status\s+in\s*\('reserved',\s*'checkout_created'\)\)/i);
});

test('entitlement migration exposes only the owning customer entitlement projection', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /revoke all on table public\.tier_catalog, public\.entitlements, public\.upgrade_reservations, public\.refund_dependencies from public, anon, authenticated/i);
  assert.match(sql, /grant all on table public\.tier_catalog, public\.entitlements, public\.upgrade_reservations, public\.refund_dependencies to service_role/i);
  assert.match(sql, /grant select on table public\.entitlements to authenticated/i);
  assert.match(sql, /create policy entitlements_select_own[\s\S]*to authenticated[\s\S]*using\s*\(\s*\(select auth\.uid\(\)\)\s*=\s*user_id\s*\)/i);
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all)[^;]*upgrade_reservations[^;]*to\s+(?:anon|authenticated)/i);
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all)[^;]*refund_dependencies[^;]*to\s+(?:anon|authenticated)/i);
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all)[^;]*tier_catalog[^;]*to\s+(?:anon|authenticated)/i);
});

test('entitlement migration indexes ownership and foreign-key lookup paths', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  for (const pattern of [
    /create index[^;]+entitlements[^;]+user_id/i,
    /create index[^;]+entitlements[^;]+source_order_id/i,
    /create index[^;]+upgrade_reservations[^;]+source_entitlement_id/i,
    /create index[^;]+refund_dependencies[^;]+dependent_order_id/i,
  ]) assert.match(sql, pattern);
});
