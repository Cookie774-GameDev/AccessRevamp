import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('paid customer-agent work cannot be claimed before an explicit human handoff approval', async () => {
  const sql = await readFile(
    new URL('../supabase/migrations/20260725120000_require_customer_agent_handoff_approval.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /customer_agent_handoff_approved_at timestamptz/i);
  assert.match(sql, /customer_agent_handoff_approved_by text/i);
  assert.match(sql, /p_agent <> 'customer_agent'[\s\S]*customer_agent_handoff_approved_at is not null/i);
  assert.match(sql, /approve_accessrevamp_customer_agent_handoff/i);
  assert.match(sql, /length\(trim\(coalesce\(p_approved_by/i);
  assert.match(sql, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to authenticated/i);
});
