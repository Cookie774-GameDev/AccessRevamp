import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const baseSql = await readFile('supabase/migrations/202607170001_accessrevamp.sql', 'utf8');
const ceilingSql = await readFile('supabase/migrations/20260721070000_raise_outreach_daily_ceiling.sql', 'utf8');

test('outreach has a hard maximum of 1000 and remains disabled by default', () => {
  assert.match(baseSql, /sending_enabled boolean not null default false/);
  assert.match(ceilingSql, /daily_limit between 1 and 1000/);
  assert.match(ceilingSql, /alter column daily_limit set default 1000/);
  assert.match(ceilingSql, /values \(true, 1000, false\)/);
  assert.match(ceilingSql, /least\(greatest\(v_settings\.daily_limit, 1\), 1000\)/);
  assert.match(ceilingSql, /Daily outreach limit of % reached/);
});

test('the daily ceiling is transactional under concurrent workers and uses the scheduled UTC day', () => {
  assert.match(ceilingSql, /pg_advisory_xact_lock/);
  assert.match(ceilingSql, /hashtextextended\('accessrevamp-outreach-'/);
  assert.match(ceilingSql, /v_effective_day/);
  assert.match(ceilingSql, /coalesce\(scheduled_for, sent_at, created_at\)/);
});

test('human review, verified evidence, provenance, suppression, and spacing remain enforced', () => {
  assert.match(ceilingSql, /public_contact_verified_at/);
  assert.match(ceilingSql, /At least one human-verified finding is required/);
  assert.match(ceilingSql, /Human approval is required/);
  assert.match(ceilingSql, /Recipient is suppressed/);
  assert.match(ceilingSql, /Recipient was already contacted in the last 30 days/);
  assert.match(ceilingSql, /Sending is disabled/);
});

test('customer tables have row-level security', () => {
  assert.match(baseSql, /alter table public\.profiles enable row level security/);
  assert.match(baseSql, /profiles_select_own/);
  assert.match(baseSql, /orders_select_own/);
  assert.match(baseSql, /projects_select_own/);
});
