import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

const [
  migration,
  operatorFunction,
  operatorClient,
  operatorPage,
  styles,
  mainAgent,
  customerAgent,
  designAgent,
  websiteAgent,
  designSkill,
  designTemplate,
] = await Promise.all([
  read('supabase/migrations/20260727120000_creative_review_command_center.sql'),
  read('netlify/functions/operator-overview.mjs'),
  read('src/services/operator.js'),
  read('src/pages/operator.js'),
  read('src/styles/customer-hub.css'),
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

test('operator command center loads customer-isolated evidence and exposes separate review actions', () => {
  assert.match(operatorPage, /Creative review command center/i);
  assert.match(operatorFunction, /project_creative_feedback/);
  assert.match(operatorFunction, /project_creative_review_events/);
  assert.match(operatorFunction, /project_design_option_assets/);
  assert.match(operatorFunction, /project_source_assets/);
  assert.match(operatorFunction, /request_creative_changes/);
  assert.match(operatorFunction, /approve_creative_design/);
  assert.match(operatorFunction, /approve_creative_delivery/);
  assert.match(operatorFunction, /register_creative_version/);
  assert.match(operatorClient, /data-creative-review-stage/);
  assert.match(operatorClient, /Request changes/);
  assert.match(operatorClient, /Approve design/);
  assert.match(operatorClient, /Approve for customer delivery/);
  assert.match(operatorClient, /Version history/);
  assert.match(operatorClient, /Source evidence/);
  assert.match(styles, /\.creative-command-center/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(operatorClient, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
});

test('agent contracts require command-center submission and rich sourced brand preference notes', () => {
  for (const contract of [mainAgent, customerAgent, designAgent, websiteAgent, designSkill, designTemplate]) {
    assert.match(contract, /Creative Review Command Center/i);
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

