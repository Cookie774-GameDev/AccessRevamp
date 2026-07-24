import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationSql = await readFile(
  'supabase/migrations/20260723090000_raise_first_touch_word_limit.sql',
  'utf8',
);

test('raises the singleton maximum message-word setting to 200 without enabling sending', () => {
  assert.match(
    migrationSql,
    /maximum_message_words between target_message_words and 200/,
  );
  assert.match(migrationSql, /alter column maximum_message_words set default 200/);
  assert.match(
    migrationSql,
    /insert into public\.outreach_settings \(singleton, maximum_message_words, sending_enabled\)\s*values \(true, 200, false\)/,
  );
  assert.doesNotMatch(migrationSql, /sending_enabled\s*=\s*true/i);
});

test('limits cold messages to 200 words in both table and queue enforcement', () => {
  assert.match(migrationSql, /message_kind <> 'cold' or word_count <= 200/);
  assert.match(migrationSql, /least\(v_settings\.maximum_message_words, 200\)/);
  assert.match(
    migrationSql,
    /Outreach message exceeds the % word maximum', least\(v_settings\.maximum_message_words, 200\)/,
  );
});

test('retains fail-closed approval, suppression, provenance, mailbox, and spacing gates', () => {
  assert.match(migrationSql, /security definer/);
  assert.match(migrationSql, /set search_path = pg_catalog/);
  assert.match(migrationSql, /public_contact_verified_at is null/);
  assert.match(migrationSql, /Recipient must match verified public contact/);
  assert.match(migrationSql, /Recipient is suppressed/);
  assert.match(migrationSql, /At least one human-verified finding is required/);
  assert.match(migrationSql, /Human approval is required/);
  assert.match(migrationSql, /Sending is disabled/);
  assert.match(migrationSql, /No active authorized mailbox capacity/);
  assert.match(migrationSql, /pg_advisory_xact_lock/);
  assert.match(migrationSql, /Recipient was already contacted in the last 30 days/);
  assert.match(
    migrationSql,
    /revoke all on function public\.enforce_accessrevamp_outreach\(\) from public, anon, authenticated/,
  );
  assert.match(
    migrationSql,
    /grant execute on function public\.enforce_accessrevamp_outreach\(\) to service_role/,
  );
});
