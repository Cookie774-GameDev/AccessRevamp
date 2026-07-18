import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const importer = await readFile('scripts/import-reviewed-prospects.mjs', 'utf8');
const approver = await readFile('scripts/approve-outreach.mjs', 'utf8');

test('reviewed-prospect imports are capped and create drafts only', () => {
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
