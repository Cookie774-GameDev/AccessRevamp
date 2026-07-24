import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [script, workflow, authPage, otpStyles, recoveryTemplate] = await Promise.all([
  readFile('scripts/supabase/apply-auth-branding.mjs', 'utf8'),
  readFile('.github/workflows/supabase-auth-branding.yml', 'utf8'),
  readFile('src/pages/auth.js', 'utf8'),
  readFile('src/styles/auth-otp.css', 'utf8'),
  readFile('supabase/templates/accessrevamp-recovery.html', 'utf8'),
]);

test('production and recovery Auth URLs are applied before optional email transport branding', () => {
  assert.match(script, /const basePayload = \{/);
  assert.match(script, /const templatePayload = \{/);
  assert.ok(
    script.indexOf('body: JSON.stringify(basePayload)') < script.indexOf('if (customSmtpRequested)'),
    'production and recovery redirect settings must be applied before optional SMTP templates',
  );
  assert.match(script, /recover-account/);
  assert.match(script, /default-sender-six-digit-code/);
  assert.match(script, /production-link-fallback/);
  assert.match(script, /customSmtpRequiredForOfficialSender/);
  assert.match(script, /known Free-plan restrictions/i);
});

test('workflow supports Resend Gmail or full SMTP for Access Revamp Authorization', () => {
  assert.match(workflow, /RESEND_API_KEY/);
  assert.match(workflow, /ACCESSREVAMP_FROM_EMAIL/);
  assert.match(workflow, /ACCESSREVAMP_GMAIL_USER/);
  assert.match(workflow, /ACCESSREVAMP_GMAIL_APP_PASSWORD/);
  assert.match(workflow, /smtp_mode=resend/);
  assert.match(workflow, /smtp_mode=gmail/);
  assert.match(workflow, /Access Revamp Authorization/);
  assert.match(script, /smtp_host: 'smtp\.resend\.com'/);
  assert.match(script, /smtp_host: 'smtp\.gmail\.com'/);
  assert.match(script, /OFFICIAL_SENDER_NAME/);
  assert.match(workflow, /accessrevamp-auth-email-diagnostics/);
});

test('signup sign-in and recovery screens use code entry with a safe legacy fallback', () => {
  assert.match(authPage, /Email shows a secure button instead\?/);
  assert.match(authPage, /returns to the AccessRevamp website/i);
  assert.match(otpStyles, /\.auth-code-fallback/);
  assert.match(otpStyles, /@media \(max-width: 680px\)[\s\S]*\.auth-code-fallback/);
  assert.match(recoveryTemplate, /\{\{ \.Token \}\}/);
  assert.doesNotMatch(recoveryTemplate, /\{\{ \.ConfirmationURL \}\}/);
});
