import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('inbound matching returns the permanent owner and exact original mailbox identity', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260725114500_route_replies_to_permanent_owner.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /join public\.accessrevamp_mailbox_owner_assignments/i);
  assert.match(sql, /'owner:'\s*\|\|\s*a\.owner_code/i);
  assert.match(sql, /m\.address\s+as mailbox_address/i);
  assert.match(sql, /m\.provider_mailbox_id/i);
  assert.match(sql, /m\.reply_handling_authorized/i);
  assert.match(sql, /m\.provider\s*=\s*'icemail_azure'/i);
  assert.match(sql, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to authenticated/i);
});
