import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../supabase/migrations/20260728030000_fix_homepage_reveal_workflow.sql',
  import.meta.url,
);

async function readHomepageManifest() {
  const sql = await readFile(migrationUrl, 'utf8');
  const match = sql.match(
    /update public\.accessrevamp_workflow_templates[\s\S]*?set task_manifest = '(\[[\s\S]*?\])'::jsonb[\s\S]*?where plan_key = 'homepage_reveal'/i,
  );
  assert.ok(match, 'migration must replace the canonical Homepage Reveal manifest');
  return { sql, manifest: JSON.parse(match[1].replaceAll("''", "'")) };
}

test('Homepage Reveal waits for an owner-reviewed customer selection then produces reviewed customer docs and stops', async () => {
  const { manifest } = await readHomepageManifest();
  const taskKeys = manifest.map(({ task_key: taskKey }) => taskKey);

  assert.deepEqual(taskKeys, [
    'payment_reconcile',
    'create_customer_folder',
    'research_customer_website',
    'passive_quality_audit',
    'passive_security_review',
    'growth_and_monetization_guidance',
    'generate_five_homepage_options',
    'human_quality_review',
    'customer_homepage_selection',
    'write_customer_skill_md',
    'owner_review_customer_skill_md',
    'write_customer_design_md',
    'owner_review_customer_design_md',
    'assemble_initial_delivery',
    'notify_customer',
    'homepage_reveal_handoff_stop',
  ]);

  const byKey = Object.fromEntries(manifest.map((task) => [task.task_key, task]));
  assert.equal(byKey.customer_homepage_selection.status, 'waiting_customer');
  assert.equal(byKey.customer_homepage_selection.selection_count_min, 1);
  assert.equal(byKey.customer_homepage_selection.selection_count_max, 3);
  assert.equal(byKey.customer_homepage_selection.rank_order_preserved, true);
  assert.equal(byKey.customer_homepage_selection.primary_option_index, 1);
  assert.equal(byKey.write_customer_skill_md.agent, 'customer_agent');
  assert.deepEqual(byKey.write_customer_skill_md.required_outputs, ['SKILL.md']);
  assert.equal(
    byKey.write_customer_skill_md.primary_design_source,
    'customer_homepage_selection.output_payload.primary_design_option_id',
  );
  assert.equal(byKey.owner_review_customer_skill_md.agent, 'main_agent');
  assert.equal(byKey.write_customer_design_md.agent, 'customer_agent');
  assert.deepEqual(byKey.write_customer_design_md.required_outputs, ['DESIGN.md']);
  assert.equal(
    byKey.write_customer_design_md.primary_design_source,
    'customer_homepage_selection.output_payload.primary_design_option_id',
  );
  assert.equal(byKey.owner_review_customer_design_md.agent, 'main_agent');
  assert.deepEqual(byKey.assemble_initial_delivery.customer_outputs, [
    'sourced_audit',
    'five_homepage_concepts',
  ]);
  assert.deepEqual(byKey.assemble_initial_delivery.internal_handoff_evidence, [
    'customer_selection',
    'SKILL.md',
    'DESIGN.md',
  ]);
  assert.equal(byKey.homepage_reveal_handoff_stop.stop_before_implementation, true);

  assert.equal(taskKeys.some((key) => /build|implement|poster/i.test(key)), false);
});

test('Homepage Reveal selection completion is guarded before workflow advancement', async () => {
  const { sql } = await readHomepageManifest();

  assert.match(sql, /create or replace function public\.activate_accessrevamp_homepage_selection_from_feedback/i);
  assert.match(sql, /new\.action = 'select_designs'/i);
  assert.match(sql, /cardinality\(new\.selected_option_ids\) between 1 and 3/i);
  assert.match(sql, /new\.revision_round = 0/i);
  assert.match(sql, /selection_task\.task_key = 'customer_homepage_selection'/i);
  assert.match(sql, /selection_task\.status = 'waiting_customer'/i);
  assert.match(sql, /'selected_option_ids', to_jsonb\(new\.selected_option_ids\)/i);
  assert.match(sql, /'primary_design_option_id', new\.selected_option_ids\[1\]/i);
  assert.match(sql, /perform public\.complete_accessrevamp_workflow_task/i);
  assert.match(sql, /create or replace function public\.guard_accessrevamp_homepage_selection_completion/i);
  assert.match(sql, /old\.status is distinct from 'succeeded'/i);
  assert.match(sql, /review_task\.task_key = 'human_quality_review'[\s\S]*review_task\.status = 'succeeded'/i);
  assert.match(sql, /v_selection_count not between 1 and 3/i);
  assert.match(sql, /count\(distinct selected_option\.value\)[\s\S]*<> v_selection_count/i);
  assert.match(sql, /count\(\*\)[\s\S]*into v_matching_option_count/i);
  assert.match(sql, /v_matching_option_count <> v_selection_count/i);
  assert.match(sql, /option_row\.project_id = workflow_row\.project_id/i);
  assert.match(sql, /option_row\.option_group in \('homepage_normal','homepage_cinematic'\)/i);
  assert.match(sql, /option_row\.revision_round = 0/i);
  assert.match(sql, /option_row\.status in \('customer_ready','selected'\)/i);
  assert.match(sql, /option_row\.human_approved_at is not null/i);
  assert.match(sql, /new\.output_payload ->> 'primary_design_option_id'[\s\S]*selected_options\s*->>\s*0/i);
});

test('Homepage Reveal backfill is paid-order-only and never creates workflows for orderless evaluations', async () => {
  const { sql } = await readHomepageManifest();

  assert.match(sql, /join public\.orders paid_order[\s\S]*paid_order\.status = 'paid'/i);
  assert.doesNotMatch(sql, /insert into public\.project_workflows/i);
  assert.doesNotMatch(sql, /bootstrap_accessrevamp_project_workflow\s*\(/i);
});
