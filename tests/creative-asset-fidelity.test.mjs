import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');
const approvalMigration = await read(
  'supabase/migrations/20260728020000_fix_owner_approval_gates.sql',
).catch((error) => {
  if (error.code === 'ENOENT') return '';
  throw error;
});

const functionBody = (sql, name) => {
  const match = sql.match(new RegExp(
    `create or replace function public\\.${name}\\b[\\s\\S]*?\\$\\$;`,
    'i',
  ));
  return match?.[0] || '';
};

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

test('artifact finalization fails closed for approval-sensitive customer outputs', () => {
  const sql = functionBody(approvalMigration, 'operator_finalize_project_artifact');
  assert.match(sql, /accessrevamp_operators[\s\S]*user_id\s*=\s*p_created_by[\s\S]*active/i);
  for (const artifactType of ['design_image', 'poster', 'video', 'website_build', 'skill_md', 'design_md']) {
    assert.match(sql, new RegExp(`'${artifactType}'`));
  }
  assert.match(sql, /metadata\s*->>\s*'design_option_id'/i);
  assert.match(sql, /option\.project_id\s*=\s*v_artifact\.project_id/i);
  assert.match(sql, /design_review_status\s*<>\s*'approved'/i);
  assert.match(sql, /delivery_review_status\s*<>\s*'approved'/i);
  assert.match(sql, /design_approved_by\s+is\s+null/i);
  assert.match(sql, /delivery_approved_by\s+is\s+null/i);
  assert.match(sql, /rights_review_status\s*<>\s*'approved'/i);
  assert.match(sql, /copy_review_status\s*<>\s*'approved'/i);
  assert.match(sql, /product_fidelity_status\s*<>\s*'approved'/i);
  assert.match(sql, /source_manifest_verified_at\s+is\s+null/i);
  assert.match(sql, /project_design_option_assets/i);
  assert.match(sql, /project_source_assets/i);
});

test('specification artifacts require durable project selection and finalizer stays service-only', () => {
  const sql = functionBody(approvalMigration, 'operator_finalize_project_artifact');
  assert.match(sql, /artifact_type\s+in\s*\(\s*'skill_md'\s*,\s*'design_md'\s*\)/i);
  assert.match(sql, /project_approval_selections/i);
  assert.match(sql, /project_approval_links/i);
  assert.match(sql, /v_design_option_id\s*=\s*any\s*\(\s*selection\.selected_option_ids\s*\)/i);
  assert.match(approvalMigration, /revoke all on function public\.operator_finalize_project_artifact\(uuid,\s*uuid,\s*boolean\)\s+from public,\s*anon,\s*authenticated/i);
  assert.match(approvalMigration, /grant execute on function public\.operator_finalize_project_artifact\(uuid,\s*uuid,\s*boolean\)\s+to service_role/i);
  assert.match(sql, /security definer[\s\S]*set search_path\s*=\s*pg_catalog,\s*public/i);
});

test('specification artifacts also accept an exact non-rejected dashboard design selection', () => {
  const sql = functionBody(approvalMigration, 'operator_finalize_project_artifact');
  assert.match(sql, /customer_project_feedback\s+feedback/i);
  assert.match(sql, /feedback\.project_id\s*=\s*v_artifact\.project_id/i);
  assert.match(sql, /feedback\.action\s*=\s*'select_designs'/i);
  assert.match(sql, /feedback\.status\s*<>\s*'rejected'/i);
  assert.match(sql, /v_design_option_id\s*=\s*any\s*\(\s*feedback\.selected_option_ids\s*\)/i);
});
