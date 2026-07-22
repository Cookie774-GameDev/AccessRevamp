import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [migration, issuer, approvalFunction] = await Promise.all([
  readFile('supabase/migrations/20260722010000_fix_workflow_approval_guards.sql', 'utf8'),
  readFile('scripts/issue-project-approval-link.mjs', 'utf8'),
  readFile('netlify/functions/project-approval.mjs', 'utf8'),
]);

test('unactivated optional revisions cannot block required workflow progression', () => {
  assert.match(migration, /v_active_optional integer/);
  assert.match(migration, /not required[\s\S]*status in \('queued','running','waiting_customer','waiting_integration'\)/);
  assert.match(migration, /required[\s\S]*or status in \('queued','running','waiting_customer','waiting_integration'\)/);
  assert.match(migration, /not required[\s\S]*status = 'blocked'/);
  assert.match(migration, /'optional task was not activated'/);
  assert.doesNotMatch(migration, /where workflow_id = p_workflow_id and status not in \('succeeded','skipped','canceled'\)\s+order by/);
});

test('approval links carry an explicit option-group and revision scope', () => {
  assert.match(migration, /allowed_option_groups text\[\] not null default '\{\}'/);
  assert.match(migration, /revision_round_scope smallint/);
  assert.match(migration, /homepage_selection'[\s\S]*homepage_normal[\s\S]*homepage_cinematic/);
  assert.match(migration, /cinematic_sequence_selection'[\s\S]*cinematic_sequence/);
  assert.match(migration, /scene_selection'[\s\S]*cinematic_scene/);
  assert.match(migration, /o\.option_group = any\(v_link\.allowed_option_groups\)/);
  assert.match(migration, /o\.revision_round = v_link\.revision_round_scope/);
  assert.match(migration, /Selected option is outside this approval link scope/);
});

test('approval-link issuer writes the same scope and binds revisions to their exact task', () => {
  assert.match(issuer, /optionGroupsByPurpose/);
  assert.match(issuer, /revision_selection'[\s\S]*optional_revision_round_one/);
  assert.match(issuer, /optional_revision_round_two/);
  assert.match(issuer, /allowed_option_groups: allowedOptionGroups/);
  assert.match(issuer, /revision_round_scope: revisionRoundScope/);
  assert.match(issuer, /Revision approval links require the exact revision workflow task ID/);
});

test('private approval GET responses show only options inside the stored scope', () => {
  assert.match(approvalFunction, /allowed_option_groups,revision_round_scope/);
  assert.match(approvalFunction, /\.in\('option_group', allowedGroups\)/);
  assert.match(approvalFunction, /query = query\.eq\('revision_round', link\.revision_round_scope\)/);
  assert.match(approvalFunction, /This approval link is not configured for project options/);
  assert.match(approvalFunction, /approvalScope/);
});
