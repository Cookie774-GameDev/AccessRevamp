import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('automatic ordinary replies reserve the original mailbox five-message daily capacity and are durably logged', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260725121500_worker6_reply_send_accounting.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /reserve_accessrevamp_reply_send/i);
  assert.match(sql, /cold_sent\s*\+\s*replies_sent\s*<\s*5/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /worker6-ordinary-reply-v1/i);
  assert.match(sql, /record_accessrevamp_sent_reply/i);
  assert.match(sql, /outbound_provider_message_id/i);
  assert.match(sql, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to authenticated/i);
});
