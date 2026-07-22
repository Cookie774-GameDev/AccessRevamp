import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

const skillPaths = [
  'docs/agent-system/skills/cinematic-scroll/SKILL.md',
  'docs/agent-system/skills/customer-delivery/SKILL.md',
  'docs/agent-system/skills/design-brief/SKILL.md',
  'docs/agent-system/skills/growth-optimization/SKILL.md',
  'docs/agent-system/skills/outreach/SKILL.md',
  'docs/agent-system/skills/payment-reconciliation/SKILL.md',
  'docs/agent-system/skills/quality-assurance/SKILL.md',
  'docs/agent-system/skills/security-audit/SKILL.md',
  'docs/agent-system/skills/website-audit/SKILL.md',
  'docs/agent-system/skills/website-build/SKILL.md',
  'docs/agent-system/skills/website-research/SKILL.md',
];

test('CLAUDE.md carries the current 100-inbox task and fail-closed completion rules', async () => {
  const memory = await read('CLAUDE.md');
  assert.match(memory, /@docs\/agent-system\/README\.md/);
  assert.match(memory, /100 inboxes/);
  assert.match(memory, /500 cold \+ 500 provider-managed warm-up/);
  assert.match(memory, /Stripe remains sandbox-only/);
  assert.match(memory, /Do not stop for routine clarification/);
  assert.match(memory, /An agent message alone is never proof/);
});

test('Claude Code settings accept file edits but deny destructive and financial commands', async () => {
  const settings = JSON.parse(await read('.claude/settings.json'));
  assert.equal(settings.permissions.defaultMode, 'acceptEdits');
  assert.ok(settings.permissions.allow.includes('Bash(npm test:*)'));
  assert.ok(settings.permissions.deny.includes('Bash(git push --force:*)'));
  assert.ok(settings.permissions.deny.includes('Bash(git reset --hard:*)'));
  assert.ok(settings.permissions.deny.includes('Bash(stripe refunds create:*)'));
  assert.ok(!settings.permissions.allow.includes('Bash'));
});

test('all eleven canonical operation skills exist and stay below the artifact limit', async () => {
  for (const path of skillPaths) {
    const info = await stat(path);
    assert.ok(info.isFile(), `${path} must be a file`);
    assert.ok(info.size > 0 && info.size <= 9_000_000, `${path} must be nonempty and within the size limit`);
  }
});

test('integration subagent and Windows installer preserve safety gates', async () => {
  const [integration, installer, verifier] = await Promise.all([
    read('docs/agent-system/subagentforintegrations.md'),
    read('scripts/install-agent-system-to-claude.ps1'),
    read('scripts/verify-agent-system-to-claude.ps1'),
  ]);
  assert.match(integration, /idempotent item claimed from `accessrevamp_integration_outbox`/);
  assert.match(integration, /Never use this worker to refund/);
  assert.match(installer, /Claude\\AccessRevamp/);
  assert.match(installer, /_backups/);
  assert.match(installer, /verify-agent-system-to-claude\.ps1/);
  assert.match(verifier, /Expected at least 11 canonical SKILL\.md files/);
  assert.match(verifier, /File exceeds 9,000,000 bytes/);
  assert.match(verifier, /External provider activation remains fail-closed/);
});
