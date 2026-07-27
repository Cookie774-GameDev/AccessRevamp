import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

const [
  migration,
  ownerServer,
  ownerUi,
  mainAgent,
  customerAgent,
  designAgent,
  websiteAgent,
  designSkill,
  designTemplate,
] = await Promise.all([
  read('supabase/migrations/20260727120000_creative_review_command_center.sql'),
  read('scripts/owner-command-center/server.mjs'),
  read('scripts/owner-command-center/ui.mjs'),
  read('docs/agent-system/mainagent.md'),
  read('docs/agent-system/subagentforcustomer.md'),
  read('docs/agent-system/subagentfordesign.md'),
  read('docs/agent-system/subagentforwebsite.md'),
  read('docs/agent-system/skills/design-brief/SKILL.md'),
  read('docs/agent-system/templates/DESIGN_TEMPLATE.md'),
]);

test('creative review data is versioned, append-only, private, and independently delivery-approved', () => {
  assert.match(migration, /parent_option_id uuid references public\.project_design_options/i);
  assert.match(migration, /submitted_by_agent text/i);
  assert.match(migration, /design_review_status/i);
  assert.match(migration, /delivery_review_status/i);
  assert.match(migration, /create table if not exists public\.project_creative_feedback/i);
  assert.match(migration, /create table if not exists public\.project_creative_review_events/i);
  assert.match(migration, /alter table public\.project_creative_feedback enable row level security/i);
  assert.match(migration, /revoke all on table public\.project_creative_feedback from public, anon, authenticated/i);
  assert.match(migration, /grant all on table public\.project_creative_feedback to service_role/i);
  assert.match(migration, /request_accessrevamp_creative_changes/i);
  assert.match(migration, /project_workflow_tasks/i);
  assert.match(migration, /approve_accessrevamp_creative_design/i);
  assert.match(migration, /approve_accessrevamp_creative_delivery/i);
  assert.match(migration, /delivery_review_status <> 'approved'/i);
});

test('private owner command center loads customer-isolated evidence and exposes separate review actions', () => {
  assert.match(ownerServer, /project_creative_feedback/);
  assert.match(ownerServer, /project_creative_review_events/);
  assert.match(ownerServer, /project_design_option_assets/);
  assert.match(ownerServer, /project_source_assets/);
  assert.match(ownerServer, /request_accessrevamp_creative_changes/);
  assert.match(ownerServer, /approve_accessrevamp_creative_design/);
  assert.match(ownerServer, /approve_accessrevamp_creative_delivery/);
  assert.match(ownerUi, /Request changes/);
  assert.match(ownerUi, /Approve design/);
  assert.match(ownerUi, /Approve for customer delivery/);
  assert.match(ownerUi, /Version history/);
  assert.match(ownerUi, /Source evidence/);
  assert.match(ownerUi, /prefers-reduced-motion/);
  assert.doesNotMatch(ownerUi, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
});

test('agent contracts require command-center submission and rich sourced brand preference notes', () => {
  for (const contract of [mainAgent, customerAgent, designAgent, websiteAgent, designSkill, designTemplate]) {
    assert.match(contract, /private owner command center/i);
    assert.match(contract, /project ID/i);
  }
  for (const contract of [customerAgent, designAgent, designSkill, designTemplate]) {
    assert.match(contract, /font/i);
    assert.match(contract, /color relationship/i);
    assert.match(contract, /brand identity/i);
    assert.match(contract, /products? and services?/i);
    assert.match(contract, /preference/i);
  }
  assert.match(designAgent, /Never self-approve/i);
  assert.match(mainAgent, /delivery approval/i);
});
