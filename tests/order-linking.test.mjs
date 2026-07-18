import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  'supabase/migrations/202607170002_link_paid_orders.sql',
  'utf8',
);

test('paid orders are claimed by a matching confirmed account', () => {
  assert.match(sql, /lower\(customer_email\) = lower\(coalesce\(new\.email, ''\)\)/);
  assert.match(sql, /status = 'paid'/);
  assert.match(sql, /set user_id = new\.id/);
});

test('each paid order opens at most one customer project', () => {
  assert.match(sql, /insert into public\.customer_projects/);
  assert.match(sql, /on conflict \(order_id\) do nothing/);
});

test('contact submission RPC remains server-only', () => {
  assert.match(sql, /revoke execute[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute[\s\S]*to service_role/);
});

test('authenticated users cannot change profile email through the table', () => {
  assert.match(sql, /revoke update on table public\.profiles from authenticated/);
  assert.match(sql, /grant update \(full_name\) on table public\.profiles to authenticated/);
});
