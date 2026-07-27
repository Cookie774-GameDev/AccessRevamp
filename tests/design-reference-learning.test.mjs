import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('Axia Credit is captured as a learnable reference without becoming a copy template', async () => {
  const reference = await read('docs/agent-system/design-references/AXIA_CREDIT_REFERENCE.md');

  assert.match(reference, /https:\/\/www\.axiacredit\.com\//);
  assert.match(reference, /full-bleed hero/i);
  assert.match(reference, /one dominant promise/i);
  assert.match(reference, /three-step/i);
  assert.match(reference, /alternating light and dark/i);
  assert.match(reference, /do not copy/i);
  assert.match(reference, /customer-owned assets/i);
  assert.match(reference, /translate/i);
  assert.match(reference, /private owner command center/i);
});

test('design agents and customer design records apply references through evidence and divergence', async () => {
  const [designAgent, websiteAgent, designSkill, designTemplate] = await Promise.all([
    read('docs/agent-system/subagentfordesign.md'),
    read('docs/agent-system/subagentforwebsite.md'),
    read('docs/agent-system/skills/design-brief/SKILL.md'),
    read('docs/agent-system/templates/DESIGN_TEMPLATE.md'),
  ]);

  for (const contract of [designAgent, websiteAgent, designSkill, designTemplate]) {
    assert.match(contract, /AXIA_CREDIT_REFERENCE\.md/);
    assert.match(contract, /reference principles/i);
    assert.match(contract, /customer evidence/i);
    assert.match(contract, /divergence/i);
  }
  assert.match(designTemplate, /Reference translation matrix/i);
  assert.match(designTemplate, /Copied elements rejected/i);
  assert.match(designAgent, /Never copy reference copy, branding, assets, or composition/i);
});
