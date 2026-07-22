import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

const files = await Promise.all([
  read('src/components/order-wizard.js'),
  read('src/services/order-wizard.js'),
  read('netlify/functions/_shared/validation.mjs'),
  read('netlify/functions/order-draft.mjs'),
  read('netlify/functions/project-approval.mjs'),
  read('src/pages/project-approval.js'),
  read('src/services/project-approval.js'),
  read('src/pages/legal.js'),
  read('src/main.js'),
  read('netlify.toml'),
  read('supabase/migrations/20260721230000_customer_workflow_orchestration.sql'),
  read('supabase/migrations/20260721230100_mailbox_and_outreach_controls.sql'),
  read('supabase/migrations/20260721230300_correct_mailbox_count_to_100.sql'),
  read('supabase/migrations/20260721230200_customer_workflow_functions.sql'),
  read('docs/agent-system/mainagent.md'),
  read('docs/agent-system/subagentforcustomer.md'),
  read('docs/agent-system/subagentforwebsite.md'),
  read('docs/agent-system/skills/security-audit/SKILL.md'),
  read('docs/agent-system/skills/outreach/SKILL.md'),
]);

const [
  wizard,
  wizardService,
  validation,
  orderDraft,
  approvalFunction,
  approvalPage,
  approvalService,
  legal,
  main,
  netlify,
  workflowSql,
  mailboxSql,
  capacitySql,
  functionsSql,
  mainAgent,
  customerAgent,
  websiteAgent,
  securitySkill,
  outreachSkill,
] = files;

test('cinematic orders collect three or four scenes and keep portfolio permission optional', () => {
  assert.match(wizard, /name="cinematicSceneCount"/);
  assert.match(wizard, /value="3"/);
  assert.match(wizard, /value="4"/);
  assert.match(wizard, /name="portfolioConsent"/);
  assert.doesNotMatch(wizard, /name="portfolioConsent"[^>]*required/);
  assert.match(wizard, /not required to buy/i);
  assert.match(wizardService, /cinematicSceneCount\.required = enabled/);
  assert.match(wizardService, /No portfolio permission granted/);
  assert.match(validation, /Choose three or four cinematic scenes/);
  assert.match(validation, /portfolioConsent: z\.boolean\(\)\.default\(false\)/);
  assert.match(orderDraft, /cinematic_scene_count: payload\.cinematicSceneCount/);
  assert.match(orderDraft, /portfolio_consent: payload\.portfolioConsent/);
});

test('private customer approval links are hashed, expiring, one-use, and noindex', () => {
  assert.match(approvalFunction, /createHash\('sha256'\)/);
  assert.match(approvalFunction, /createSignedUrl/);
  assert.match(approvalFunction, /assertSameOrigin\(request\)/);
  assert.match(approvalFunction, /submit_accessrevamp_project_approval/);
  assert.match(approvalPage, /unique, expires automatically, and can be used only once/i);
  assert.match(approvalService, /selectedOptionIds/);
  assert.match(main, /'\/approve\/:token'/);
  assert.match(netlify, /for = "\/approve\/\*"/);
  assert.match(netlify, /X-Robots-Tag = "noindex, nofollow, noarchive, nosnippet"/);
  assert.match(functionsSql, /token_hash text not null unique|p_token_hash/);
  assert.match(functionsSql, /status = 'used'/);
});

test('plan workflows encode the promised bounded deliverables', () => {
  assert.match(workflowSql, /"normal_options":3/);
  assert.match(workflowSql, /"cinematic_options":2/);
  assert.match(workflowSql, /optional_revision_round_one/);
  assert.match(workflowSql, /optional_revision_round_two/);
  assert.match(workflowSql, /generate_ten_page_reference_images/);
  assert.match(workflowSql, /create_five_animated_posters/);
  assert.match(workflowSql, /create_ten_still_posters/);
  assert.match(workflowSql, /"images_per_scene":2/);
  assert.match(workflowSql, /"three_scene_credit_limit":150/);
  assert.match(workflowSql, /"four_scene_credit_limit":200/);
  assert.match(workflowSql, /size_bytes bigint check \(size_bytes is null or size_bytes between 0 and 9000000\)/);
});

test('external side effects fail closed until separately enabled', () => {
  assert.match(workflowSql, /external_email_transport_enabled boolean not null default false/);
  assert.match(workflowSql, /mailbox_warmup_automation_enabled boolean not null default false/);
  assert.match(workflowSql, /active_security_testing_enabled boolean not null default false/);
  assert.match(workflowSql, /external_creative_generation_enabled boolean not null default false/);
  assert.match(functionsSql, /claim_accessrevamp_integration_work/);
  assert.match(functionsSql, /p_provider in \('gmail','icemail'\)/);
  assert.match(functionsSql, /p_provider in \('canva','higgsfield'\)/);
  assert.match(functionsSql, /project_security_authorizations/);
  assert.match(functionsSql, /Active security authorization is missing/);
});

test('outreach stays human-reviewed, mailbox-aware, and within 175 words', () => {
  assert.match(mailboxSql, /target_message_words integer not null default 150/);
  assert.match(mailboxSql, /maximum_message_words integer not null default 175/);
  assert.match(mailboxSql, /cold_messages_per_mailbox integer not null default 5/);
  assert.match(mailboxSql, /warm_messages_per_mailbox integer not null default 5/);
  assert.match(capacitySql, /configured_mailbox_count set default 100/);
  assert.match(capacitySql, /configured_mailbox_count = 100/);
  assert.match(capacitySql, /configured_total_allocation integer/);
  assert.match(capacitySql, /active_authorized_mailboxes/);
  assert.match(mailboxSql, /spam_classification_automation_enabled boolean not null default false check \(not spam_classification_automation_enabled\)/);
  assert.match(mailboxSql, /human_approved_by is not null/);
  assert.match(mailboxSql, /Message must include an opt-out instruction/);
  assert.match(mailboxSql, /v_active_mailboxes \* greatest\(v_settings\.cold_messages_per_mailbox, 0\)/);
  assert.match(mailboxSql, /least\(greatest\(v_settings\.daily_limit, 1\), 1000, v_mailbox_operating_cap\)/);
  assert.match(outreachSkill, /100 inboxes/i);
  assert.match(outreachSkill, /500 cold and 500 warm-up messages per day/i);
});

test('agent contracts require evidence, payment reconciliation, safe security scope, and visual QA', () => {
  assert.match(mainAgent, /Never trust a browser success redirect/);
  assert.match(mainAgent, /Never issue or automate a refund/);
  assert.match(customerAgent, /Every factual claim needs a source URL and retrieval time/);
  assert.match(customerAgent, /SKILL\.md/);
  assert.match(customerAgent, /DESIGN\.md/);
  assert.match(websiteAgent, /compare it against the approved reference images/i);
  assert.match(websiteAgent, /9,000,000 bytes/);
  assert.match(securitySkill, /Active testing is allowed only/);
  assert.match(securitySkill, /No brute force/);
});

test('legal copy does not make portfolio publication a condition of purchase', () => {
  assert.match(legal, /Purchase does not automatically grant portfolio rights/);
  assert.match(legal, /separate optional permission/);
  assert.match(legal, /automated spam-classification manipulation is prohibited/);
});
