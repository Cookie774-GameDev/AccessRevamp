import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const importer = await readFile('scripts/import-reviewed-prospects.mjs', 'utf8');
const approver = await readFile('scripts/approve-outreach.mjs', 'utf8');
const exporter = await readFile('scripts/export-approved-outreach.mjs', 'utf8');
const outreachStandard = await readFile('docs/OUTREACH_STANDARD.md', 'utf8');

test('reviewed-prospect imports remain small, human-reviewable batches that create drafts only', () => {
  assert.match(importer, /lines\.length > 20/);
  assert.match(importer, /status: 'draft'/);
  assert.match(importer, /No email was sent/);
});

test('suppressed recipients are skipped before draft creation', () => {
  assert.match(importer, /from\('suppression_list'\)/);
  assert.match(importer, /skipped_suppressed/);
});

test('approval requires real sender settings and an opt-out URL', () => {
  assert.match(approver, /sender_name,sender_email,postal_address,site_url/);
  assert.match(approver, /unsubscribe\?token=/);
  assert.match(approver, /\{\{OPT_OUT_URL\}\}/);
});

test('approval does not contain a mail transport', () => {
  assert.match(approver, /status: 'approved'/);
  assert.match(approver, /No email was sent/);
  assert.doesNotMatch(approver, /nodemailer|sendgrid|resend\.emails|gmail\.users\.messages\.send/i);
});

test('approved export follows the configured database limit but never exceeds 1000', () => {
  assert.match(exporter, /from\('outreach_settings'\)/);
  assert.match(exporter, /select\('daily_limit'\)/);
  assert.match(exporter, /Math\.min\([\s\S]*1000\)/);
  assert.match(exporter, /\.limit\(exportLimit\)/);
  assert.match(exporter, /No email was sent/);
});

test('responsible outreach standard preserves review, reply, and suppression boundaries', () => {
  assert.match(outreachStandard, /human-approved/i);
  assert.match(outreachStandard, /working reply path/i);
  assert.match(outreachStandard, /verified mailing identity/i);
  assert.match(outreachStandard, /one-click suppression link/i);
  assert.match(outreachStandard, /at most one follow-up/i);
  assert.match(outreachStandard, /stop immediately after an objection or opt-out/i);
  assert.match(outreachStandard, /intentionally does not provide an unattended commercial send loop/i);
});
