import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('creative command center is absent from the production website and Worker API', async () => {
  const [main, metadata, worker] = await Promise.all([
    read('src/main.js'),
    read('src/app/metadata.js'),
    read('worker/index.ts'),
  ]);
  assert.doesNotMatch(main, /operatorPage|\/operator|services\/operator/);
  assert.doesNotMatch(metadata, /\/operator|Operator workspace/);
  assert.doesNotMatch(worker, /operatorOverview|\/api\/operator-overview/);
});

test('owner command center is loopback-only with local session and mutation protection', async () => {
  const [server, ui, pkg] = await Promise.all([
    read('scripts/owner-command-center/server.mjs'),
    read('scripts/owner-command-center/ui.mjs'),
    read('package.json'),
  ]);
  assert.match(server, /127\.0\.0\.1/);
  assert.doesNotMatch(server, /0\.0\.0\.0/);
  assert.match(server, /randomBytes/);
  assert.match(server, /HttpOnly;\s*SameSite=Strict/);
  assert.match(server, /x-owner-csrf/);
  assert.match(server, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(server, /request_accessrevamp_creative_changes/);
  assert.match(server, /approve_accessrevamp_creative_design/);
  assert.match(server, /approve_accessrevamp_creative_delivery/);
  assert.match(server, /project_workflow_tasks/);
  assert.doesNotMatch(ui, /SUPABASE_SERVICE_ROLE_KEY|service_role|send email|mailto:/i);
  assert.match(ui, /Request changes/);
  assert.match(ui, /Approve design/);
  assert.match(ui, /Approve for customer delivery/);
  assert.match(ui, /Source evidence/);
  assert.match(ui, /Version history/);
  assert.match(pkg, /command-center/);
});

test('agent contracts require the private owner gate before customer visibility', async () => {
  const contracts = await Promise.all([
    'docs/agent-system/README.md',
    'docs/agent-system/mainagent.md',
    'docs/agent-system/subagentfordesign.md',
    'docs/agent-system/subagentforwebsite.md',
    'docs/agent-system/templates/DESIGN_TEMPLATE.md',
    'docs/agent-system/skills/design-brief/SKILL.md',
    'docs/agent-system/skills/customer-delivery/SKILL.md',
    'docs/agent-system/skills/quality-assurance/SKILL.md',
    'docs/agent-system/skills/website-build/SKILL.md',
  ].map(read));
  for (const contract of contracts) {
    assert.match(contract, /private owner command center/i);
    assert.match(contract, /delivery approval/i);
  }
});
