import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [
  main,
  metadata,
  authPage,
  recoveryPage,
  recoveryService,
  recoveryStyles,
  confirmationTemplate,
  signInTemplate,
  recoveryTemplate,
  brandingScript,
  brandingWorkflow,
  pricingPage,
  shell,
  emailLogo,
] = await Promise.all([
  readFile('src/main.js', 'utf8'),
  readFile('src/app/metadata.js', 'utf8'),
  readFile('src/pages/auth.js', 'utf8'),
  readFile('src/pages/recovery.js', 'utf8'),
  readFile('src/services/recovery.js', 'utf8'),
  readFile('src/styles/auth-recovery.css', 'utf8'),
  readFile('supabase/templates/accessrevamp-confirmation.html', 'utf8'),
  readFile('supabase/templates/accessrevamp-magic-link.html', 'utf8'),
  readFile('supabase/templates/accessrevamp-recovery.html', 'utf8'),
  readFile('scripts/supabase/apply-auth-branding.mjs', 'utf8'),
  readFile('.github/workflows/supabase-auth-branding.yml', 'utf8'),
  readFile('src/pages/pricing.js', 'utf8'),
  readFile('src/components/shell.js', 'utf8'),
  readFile('public/accessrevamp-email-logo.svg', 'utf8'),
]);

test('account recovery is a public no-index route using the current auth design', () => {
  assert.match(main, /['"]\/forgot-password['"]/);
  assert.match(main, /['"]\/recover-account['"]/);
  assert.match(main, /setupRecoveryForm/);
  assert.match(main, /auth-recovery\.css/);
  assert.match(metadata, /['"]\/forgot-password['"]/);
  assert.match(metadata, /['"]\/recover-account['"]/);
  assert.match(authPage, /Forgot your password\?/);
  assert.match(authPage, /href="\/forgot-password"/);
  assert.match(recoveryPage, /data-recovery-request-form/);
  assert.match(recoveryPage, /data-recovery-code-form/);
  assert.match(recoveryPage, /data-recovery-password-form/);
  assert.match(recoveryPage, /pattern="\[0-9\]\{6\}"/);
  assert.equal((recoveryPage.match(/type="password"/g) || []).length, 2);
  assert.doesNotMatch(recoveryPage, /type="tel"|name="phone"/);
});

test('recovery requests an email, verifies a six-digit recovery code, and changes the password', () => {
  assert.match(recoveryService, /resetPasswordForEmail/);
  assert.match(recoveryService, /verifyOtp\(\{/);
  assert.match(recoveryService, /type:\s*['"]recovery['"]/);
  assert.match(recoveryService, /updateUser\(\{\s*password:/s);
  assert.match(recoveryService, /signOut\(\{\s*scope:\s*['"]local['"]/);
  assert.match(recoveryService, /RECOVERY_STORAGE_KEY/);
  assert.match(recoveryService, /expiresAt/);
  assert.match(recoveryService, /OTP_PATTERN\s*=\s*\/\^\[0-9\]\{6\}\$\//);
});

test('auth contrast protects dark inputs from bright browser autofill', () => {
  assert.match(recoveryStyles, /-webkit-text-fill-color:\s*#f7f4ed/i);
  assert.match(recoveryStyles, /box-shadow:\s*0 0 0 1000px #080b10 inset/i);
  assert.match(recoveryStyles, /auth-panel__topline\s*\{\s*color:\s*#aeb7c6/i);
  assert.match(recoveryStyles, /auth-code-fallback\s*\{\s*color:\s*#b8c1cf/i);
  assert.match(recoveryStyles, /@media \(max-width: 680px\)/);
});

test('signup sign-in and recovery emails are official six-digit Access Revamp messages', () => {
  for (const template of [confirmationTemplate, signInTemplate, recoveryTemplate]) {
    assert.match(template, /Access Revamp Authorization/);
    assert.match(template, /accessrevamp-email-logo\.svg/);
    assert.match(template, /\{\{ \.Token \}\}/);
    assert.doesNotMatch(template, /\{\{ \.ConfirmationURL \}\}/);
    assert.match(template, /one-time/i);
  }
  assert.match(recoveryTemplate, /password recovery code/i);
  assert.match(emailLogo, /<svg/);
  assert.match(emailLogo, /fill="#050608"/);
  assert.match(emailLogo, /stroke="#fff"/);
});

test('hosted Auth automation supports the official sender and every OTP template', () => {
  assert.match(brandingScript, /OFFICIAL_SENDER_NAME\s*=\s*['"]Access Revamp Authorization['"]/);
  assert.match(brandingScript, /\['recovery', recovery\]/);
  assert.match(brandingScript, /mailer_subjects_recovery:\s*['"]Your Access Revamp password recovery code['"]/);
  assert.match(brandingScript, /ACCESSREVAMP_GMAIL_USER/);
  assert.match(brandingScript, /ACCESSREVAMP_GMAIL_APP_PASSWORD/);
  assert.match(brandingScript, /smtp\.gmail\.com/);
  assert.match(brandingScript, /recover-account/);
  assert.match(brandingWorkflow, /SUPABASE_SMTP_SENDER_NAME:\s*Access Revamp Authorization/);
  assert.match(brandingWorkflow, /ACCESSREVAMP_GMAIL_USER/);
  assert.match(brandingWorkflow, /ACCESSREVAMP_GMAIL_APP_PASSWORD/);
  assert.match(brandingWorkflow, /smtp_mode=gmail/);
});

test('customer pages no longer display test or sandbox checkout notices', () => {
  assert.doesNotMatch(pricingPage, /Test-mode notice|Sandbox checkout|Stripe test mode/i);
  assert.match(pricingPage, /Secure one-time checkout/);
  assert.match(shell, /export function sandboxBadge\(\) \{\s*return '';\s*\}/s);
  assert.doesNotMatch(shell, />\s*Sandbox checkout\s*</i);
});
