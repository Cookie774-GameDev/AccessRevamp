import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/202607180003_add_payment_rpcs.sql';

test('reservation RPC serializes each user and returns only safe quote fields', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /create or replace function public\.reserve_accessrevamp_upgrade\s*\(\s*p_user_id uuid\s*,\s*p_target_tier_key text\s*,\s*p_request_id uuid\s*\)/i);
  assert.match(sql, /returns table\s*\([\s\S]*reservation_id uuid[\s\S]*from_tier text[\s\S]*to_tier text[\s\S]*gross_cents integer[\s\S]*credit_cents integer[\s\S]*net_cents integer[\s\S]*source_entitlement_id uuid[\s\S]*expires_at timestamptz[\s\S]*is_existing boolean[\s\S]*\)/i);
  assert.match(sql, /security definer\s+set search_path = pg_catalog/i);
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock\s*\(\s*pg_catalog\.hashtextextended\s*\(\s*p_user_id::text\s*,\s*0\s*\)\s*\)/i);
  assert.doesNotMatch(sql, /returns table\s*\([^)]*stripe/i);
  assert.doesNotMatch(sql, /p_stripe|p_price_id|p_amount/i);
});

test('reservation RPC reuses only an identical live request and blocks competing credit reservations', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /update public\.upgrade_reservations[\s\S]*status\s*=\s*'expired'[\s\S]*expires_at\s*<=\s*v_now/i);
  assert.match(sql, /idempotency_key\s*=\s*p_request_id[\s\S]*for update/i);
  assert.match(sql, /v_existing\.status\s+in\s*\(\s*'reserved'\s*,\s*'checkout_created'\s*\)[\s\S]*v_existing\.expires_at\s*>\s*v_now/i);
  assert.match(sql, /status\s+in\s*\(\s*'reserved'\s*,\s*'checkout_created'\s*\)[\s\S]*expires_at\s*>\s*v_now[\s\S]*raise exception[^;]+reservation/i);
  assert.match(sql, /from public\.entitlements[\s\S]*for update/i);
  assert.match(sql, /left\s+join public\.orders as source_order/i);
  assert.match(sql, /source_order\.status/i);
  assert.match(sql, /v_source_order_status\s+is\s+distinct\s+from\s+'paid'/i);
  assert.match(sql, /v_current_rank\s*>=\s*v_target_rank[\s\S]*raise exception/i);
  assert.match(sql, /v_credit_cents\s*:=\s*least\s*\(\s*v_effective_paid_cents\s*,\s*v_gross_cents\s*\)/i);
  assert.doesNotMatch(sql, /pg_catalog\.least/i);
  assert.match(sql, /v_net_cents\s*:=\s*v_gross_cents\s*-\s*v_credit_cents/i);
  assert.match(sql, /insert into public\.upgrade_reservations[\s\S]*p_request_id[\s\S]*returning \*[\s\S]*into v_created/i);
});

test('reservation RPC is service-only with an explicit owner and fixed search path', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /alter function public\.reserve_accessrevamp_upgrade\(uuid, text, uuid\) owner to postgres/i);
  assert.match(sql, /revoke all on function public\.reserve_accessrevamp_upgrade\(uuid, text, uuid\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.reserve_accessrevamp_upgrade\(uuid, text, uuid\) to service_role/i);
});
