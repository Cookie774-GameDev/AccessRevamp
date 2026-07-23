import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [script, workflow, authPage, otpStyles] = await Promise.all([
  readFile('scripts/supabase/apply-auth-branding.mjs', 'utf8'),
  readFile('.github/workflows/supabase-auth-branding.yml', 'utf8'),
  readFile('src/pages/auth.js', 'utf8'),
  readFile('src/styles/auth-otp.css', 'utf8'),
]);

test('production Auth URL is applied independently of restricted Free-tier templates', () => {
  assert.match(script, /const basePayload = \{/);
  assert.match(script, /const templatePayload = \{/);
  assert.ok(
    script.indexOf('body: JSON.stringify(basePayload)') < script.indexOf('if (customSmtpRequested)'),
    'the production URL and redirect allow list must be applied before optional SMTP templates',
  );
  assert.match(script, /emailDeliveryMode: officialCodeTemplatesActive \? 'official-six-digit-code' : 'production-link-fallback'/);
  assert.match(script, /customSmtpRequiredForCodeTemplates/);
  assert.match(script, /using the built-in mailer reject template modifications/);
});

test('workflow supports a minimal verified AccessRevamp sender configuration', () => {
  assert.match(workflow, /RESEND_API_KEY/);
  assert.match(workflow, /ACCESSREVAMP_FROM_EMAIL/);
  assert.match(workflow, /smtp_mode=resend/);
  assert.match(workflow, /official AccessRevamp sender/i);
  assert.match(script, /smtp_host: 'smtp\.resend\.com'/);
  assert.match(script, /smtp_user: 'resend'/);
  assert.match(script, /smtp_sender_name: 'AccessRevamp'/);
  assert.match(workflow, /accessrevamp-auth-email-diagnostics/);
});

test('desktop and mobile auth screens explain code and secure-button email verification', () => {
  assert.match(authPage, /Email shows a secure button instead\?/);
  assert.match(authPage, /returns to the AccessRevamp website/i);
  assert.match(otpStyles, /\.auth-code-fallback/);
  assert.match(otpStyles, /@media \(max-width: 680px\)[\s\S]*\.auth-code-fallback/);
});
