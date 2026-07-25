import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20260725113000_permanent_mailbox_owner_registry.sql';
const generatorPath = 'scripts/mailboxes/generate-owner-manifests.mjs';
const syncPath = 'scripts/mailboxes/sync-icemail-identities.mjs';

test('mailbox ownership is five permanent service-only groups of twenty', async () => {
  const [sql, generator, sync] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(generatorPath, 'utf8'),
    readFile(syncPath, 'utf8'),
  ]);

  for (const [code, name] of [
    ['avery', 'Avery'],
    ['jordan', 'Jordan'],
    ['casey', 'Kasey'],
    ['riley', 'Riley'],
    ['morgan', 'Morgan'],
  ]) {
    assert.match(sql, new RegExp(`'${code}'\\s*,\\s*'${name}'`));
  }
  assert.match(sql, /position smallint not null check \(position between 1 and 20\)/i);
  assert.match(sql, /unique \(owner_code, position\)/i);
  assert.match(sql, /v_mailbox_count <> 100/i);
  assert.match(sql, /group by owner_code[\s\S]*having count\(\*\) <> 20/i);
  assert.match(sql, /prevent_accessrevamp_mailbox_reassignment/i);
  assert.match(sql, /provider_mailbox_id text/i);
  assert.match(sql, /revoke all[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant[\s\S]*to service_role/i);
  assert.match(sql, /accessrevamp_mailbox_owners_deny_browser/i);
  assert.match(sql, /accessrevamp_mailbox_owner_assignments_deny_browser/i);
  assert.match(generator, /docs\/agent-system\/mailbox-owners/i);
  assert.match(generator, /mainagent\.md/i);
  assert.match(generator, /subagentforcustomer\.md/i);
  assert.match(generator, /id,address,provider,provider_mailbox_id,status,cold_daily_limit,warm_daily_limit,outbound_authorized,reply_handling_authorized/);
  assert.doesNotMatch(generator, /\.select\(['"]\*['"]\)/);
  assert.match(sync, /mailbox\?page=\$\{page\}&limit=50/);
  assert.match(sync, /mailbox\.type !== 'AZURE'/);
  assert.doesNotMatch(sync, /mailbox\.password/);
});
