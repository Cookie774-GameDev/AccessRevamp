import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20260726140000_authorize_verified_email_transports.sql';

test('production activation authorizes the exact permanent Icemail fleet', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /provider\s*=\s*'icemail_azure'/i);
  assert.match(sql, /status\s*=\s*'active'/i);
  assert.match(sql, /provider_mailbox_id\s+is\s+not\s+null/i);
  assert.match(sql, /outbound_authorized\s*=\s*true/i);
  assert.match(sql, /reply_handling_authorized\s*=\s*true/i);
  assert.match(sql, /expected exactly 100/i);
  assert.match(sql, /exactly 20 mailboxes/i);
});

test('production activation enables transport but preserves outreach compliance interlocks', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /external_email_transport_enabled\s*=\s*true/i);
  assert.match(sql, /sender_name\s*=\s*'AccessRevamp'/i);
  assert.match(sql, /sender_email\s*=\s*'support@accessrevamp\.shop'/i);
  assert.match(sql, /site_url\s*=\s*'https:\/\/accessrevamp\.com'/i);
  assert.match(sql, /sending_enabled\s*=\s*false/i);
  assert.doesNotMatch(sql, /postal_address\s*=\s*'[^']+'/i);
  assert.doesNotMatch(sql, /mailbox_warmup_automation_enabled\s*=\s*true/i);
});

test('email transport activation cannot bypass payment or outreach launch gates', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.doesNotMatch(sql, /checkout_enabled\s*=\s*true/i);
  assert.doesNotMatch(sql, /refunds_enabled\s*=\s*true/i);
  assert.doesNotMatch(sql, /sending_enabled\s*=\s*true/i);
});
