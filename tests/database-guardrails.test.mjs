import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('supabase/migrations/202607170001_accessrevamp.sql', 'utf8');

test('outreach is capped at twenty and disabled by default', () => {
  assert.match(sql, /daily_limit integer not null default 20 check \(daily_limit between 1 and 20\)/);
  assert.match(sql, /sending_enabled boolean not null default false/);
  assert.match(sql, /Daily outreach limit of 20 reached/);
});

test('human review, verified evidence, provenance, and suppression are enforced', () => {
  assert.match(sql, /public_contact_verified_at/);
  assert.match(sql, /At least one human-verified finding is required/);
  assert.match(sql, /Human approval is required/);
  assert.match(sql, /Recipient is suppressed/);
  assert.match(sql, /Recipient was already contacted in the last 30 days/);
});

test('customer tables have row-level security', () => {
  assert.match(sql, /alter table public\.profiles enable row level security/);
  assert.match(sql, /profiles_select_own/);
  assert.match(sql, /orders_select_own/);
  assert.match(sql, /projects_select_own/);
});
