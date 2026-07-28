import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('paid customer-agent work cannot be claimed before an explicit human handoff approval', async () => {
  const [handoffGate, homepageWorkflow] = await Promise.all([
    readFile(
      new URL('../supabase/migrations/20260725120000_require_customer_agent_handoff_approval.sql', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../supabase/migrations/20260728030000_fix_homepage_reveal_workflow.sql', import.meta.url),
      'utf8',
    ),
  ]);
  assert.match(handoffGate, /customer_agent_handoff_approved_at timestamptz/i);
  assert.match(handoffGate, /customer_agent_handoff_approved_by text/i);
  assert.match(handoffGate, /p_agent <> 'customer_agent'[\s\S]*customer_agent_handoff_approved_at is not null/i);
  assert.match(handoffGate, /approve_accessrevamp_customer_agent_handoff/i);
  assert.match(handoffGate, /length\(trim\(coalesce\(p_approved_by/i);
  assert.match(handoffGate, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(handoffGate, /grant execute[\s\S]*to authenticated/i);

  assert.match(homepageWorkflow, /"task_key":"write_customer_skill_md"[\s\S]*"agent":"customer_agent"/i);
  assert.match(homepageWorkflow, /"task_key":"write_customer_design_md"[\s\S]*"agent":"customer_agent"/i);
});
