import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

const [
  fidelityMigration,
  policyMigration,
  designAgent,
  customerAgent,
  designSkill,
  customerTemplate,
  skillTemplate,
  designTemplate,
] = await Promise.all([
  read('supabase/migrations/20260727090000_enforce_creative_asset_fidelity.sql'),
  read('supabase/migrations/20260727091500_add_creative_asset_deny_policies.sql'),
  read('docs/agent-system/subagentfordesign.md'),
  read('docs/agent-system/subagentforcustomer.md'),
  read('docs/agent-system/skills/design-brief/SKILL.md'),
  read('docs/agent-system/templates/CUSTOMER_FOLDER_TEMPLATE.md'),
  read('docs/agent-system/templates/CUSTOMER_SKILL_TEMPLATE.md'),
  read('docs/agent-system/templates/DESIGN_TEMPLATE.md'),
]);

test('creative source assets are isolated, hashed, rights-reviewed, and service-only', () => {
  assert.match(fidelityMigration, /create table if not exists public\.project_source_assets/i);
  assert.match(fidelityMigration, /sha256 text not null/i);
  assert.match(fidelityMigration, /rights_status text not null/i);
  assert.match(fidelityMigration, /product_identifier text/i);
  assert.match(fidelityMigration, /alter table public\.project_source_assets enable row level security/i);
  assert.match(fidelityMigration, /revoke all on table public\.project_source_assets from public, anon, authenticated/i);
  assert.match(policyMigration, /project_source_assets_deny_browser/i);
  assert.match(policyMigration, /project_design_option_assets_deny_browser/i);
  assert.match(policyMigration, /for all to anon, authenticated[\s\S]*using \(false\) with check \(false\)/i);
});

test('customer-visible designs fail closed without exact assets and reviewed copy', () => {
  assert.match(fidelityMigration, /create table if not exists public\.project_design_option_assets/i);
  assert.match(fidelityMigration, /asset_role text not null/i);
  assert.match(fidelityMigration, /product_exact/);
  assert.match(fidelityMigration, /copy_review_status/i);
  assert.match(fidelityMigration, /product_fidelity_status/i);
  assert.match(fidelityMigration, /enforce_accessrevamp_design_fidelity/i);
  assert.match(fidelityMigration, /customer_ready/);
  assert.match(fidelityMigration, /human_approved_by is null/i);
  assert.match(fidelityMigration, /rights_review_status <> 'approved'/i);
  assert.match(fidelityMigration, /No verified exact product or logo source asset is linked/i);
});

test('agent contracts prohibit regenerated products and generated raster text', () => {
  for (const contract of [designAgent, customerAgent, designSkill, skillTemplate, designTemplate]) {
    assert.match(contract, /SOURCE_ASSET_MANIFEST\.md/);
  }
  assert.match(designAgent, /Never regenerate, redraw, replace, morph, recolor, or restyle a customer product/i);
  assert.match(designAgent, /Do not use image-generation models to render customer-facing words/i);
  assert.match(designAgent, /OCR/i);
  assert.match(customerAgent, /cryptographic hash/i);
  assert.match(customerTemplate, /SOURCE_ASSET_MANIFEST\.md/);
});
