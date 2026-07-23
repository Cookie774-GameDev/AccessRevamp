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
  assert.match(script, /Supabase Free/);
});

test('workflow succeeds for production-link fallback and reports code-email readiness separately', () => {
  assert.match(workflow, /smtp_configured=false/);
  assert.match(workflow, /Production redirects fixed; custom SMTP required for code emails/);
  assert.match(workflow, /Supabase Free blocks custom template changes/);
  assert.match(workflow, /supabase-auth-branding-diagnostics/);
});

test('desktop and mobile auth screens explain the secure production-link fallback', () => {
  assert.match(authPage, /Email shows a secure button instead\?/);
  assert.match(authPage, /never on localhost/i);
  assert.match(otpStyles, /\.auth-code-fallback/);
  assert.match(otpStyles, /@media \(max-width: 680px\)[\s\S]*\.auth-code-fallback/);
});
