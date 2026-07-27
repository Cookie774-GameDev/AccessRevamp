import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../supabase/migrations/20260727101500_reconcile_stale_unpaid_checkouts.sql',
  import.meta.url,
);

test('stale unpaid Checkout Sessions fail closed locally without disabling all checkout', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /status\s*=\s*'expired'/i);
  assert.match(sql, /not exists[\s\S]*public\.orders/i);
  assert.match(sql, /interval '60 minutes'/i);
  assert.match(sql, /order_drafts[\s\S]*status\s*=\s*'expired'/i);
  assert.doesNotMatch(sql, /set\s+checkout_enabled\s*=\s*false/i);
});

test('fallback reconciliation leaves an auditable warning and resolves stale-session incidents', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /stale_checkout_reconciled/i);
  assert.match(sql, /payment_security_incidents/i);
  assert.match(sql, /status\s*=\s*'resolved'/i);
  assert.match(sql, /accessrevamp_audit_log/i);
});
