import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const importer = await readFile('scripts/import-reviewed-prospects.mjs', 'utf8');
const approver = await readFile('scripts/approve-outreach.mjs', 'utf8');
const exporter = await readFile('scripts/export-approved-outreach.mjs', 'utf8');
const preview = await readFile('netlify/functions/preview.mjs', 'utf8');

test('reviewed-prospect imports are capped and create drafts only', () => {
  assert.match(importer, /lines\.length > 20/);
  assert.match(importer, /from\('ar_findings'\)/);
  assert.match(importer, /from\('ar_previews'\)/);
  assert.match(importer, /status: 'draft'/);
  assert.match(importer, /No email was sent/);
});

test('suppressed recipients are skipped before draft creation', () => {
  assert.match(importer, /from\('ar_suppression_list'\)/);
  assert.match(importer, /skipped_suppressed/);
  assert.match(importer, /scope', 'domain'/);
});

test('private concepts are expiring, noindex, and keyed by a token hash', () => {
  assert.match(importer, /hashPreviewToken\(token\)/);
  assert.match(importer, /14 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(importer, /noindex: true/);
  assert.match(preview, /x-robots-tag': 'noindex, nofollow, noarchive'/);
  assert.match(preview, /Not the live website/);
});

test('approval requires an active staff account, real sender identity, and signed opt-out', () => {
  assert.match(approver, /from\('ar_staff'\)/);
  assert.match(approver, /staff\?\.active/);
  assert.match(approver, /SENDER_FULL_NAME/);
  assert.match(approver, /BUSINESS_POSTAL_ADDRESS/);
  assert.match(approver, /createUnsubscribeToken/);
  assert.match(approver, /unsubscribe\?token=/);
});

test('approval and export do not contain a mail transport', () => {
  assert.match(approver, /status: 'approved'/);
  assert.match(exporter, /eq\('status', 'approved'\)/);
  assert.match(approver, /No email was sent/);
  assert.match(exporter, /No email was sent/);
  assert.doesNotMatch(
    `${approver}\n${exporter}`,
    /nodemailer|sendgrid|resend\.emails|gmail\.users\.messages\.send/i,
  );
});
