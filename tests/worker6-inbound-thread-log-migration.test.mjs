import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('a uniquely routed inbound Gmail reply is appended once to its durable customer thread', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260725123000_log_worker6_inbound_thread_reply.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /record_accessrevamp_inbound_email/i);
  assert.match(sql, /direction[\s\S]*'inbound'/i);
  assert.match(sql, /message_kind[\s\S]*'reply'/i);
  assert.match(sql, /'gmail:'\s*\|\|\s*p_gmail_message_id/i);
  assert.match(sql, /on conflict \(provider_message_id\)/i);
  assert.match(sql, /grant execute[\s\S]*to service_role/i);
});
