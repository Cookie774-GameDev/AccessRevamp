import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('supabase/migrations/202607170001_accessrevamp.sql', 'utf8');

test('paid orders are linked only to a confirmed matching account', () => {
  assert.match(sql, /v_order\.payment_status <> 'paid'/);
  assert.match(sql, /u\.email_confirmed_at is not null/);
  assert.match(sql, /lower\(u\.email\) = lower\(v_order\.customer_email\)/);
  assert.match(sql, /perform public\.ar_claim_customer_records/);
});

test('each paid order opens at most one customer project', () => {
  assert.match(sql, /order_id uuid unique references public\.ar_orders/);
  assert.match(sql, /on conflict \(order_id\) do nothing/);
});

test('order-linking and contact rate limiting remain server-only', () => {
  assert.match(sql, /revoke all on function public\.ar_link_paid_order\(uuid\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.ar_link_paid_order\(uuid\) to service_role/);
  assert.match(sql, /revoke all on function public\.ar_enforce_rate_limit\(text, text, integer, integer\) from public, anon, authenticated/);
});

test('authenticated customers can update only their display name', () => {
  assert.match(sql, /revoke all on table public\.ar_profiles from anon, authenticated/);
  assert.match(sql, /grant update \(display_name\) on table public\.ar_profiles to authenticated/);
});
