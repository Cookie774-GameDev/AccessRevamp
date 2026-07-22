import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { requireConfirmedUser } from '../netlify/functions/_shared/auth.mjs';
import { createAuthLoginStartHandler } from '../netlify/functions/auth-login-start.mjs';

const read = (path) => readFile(path, 'utf8');

const [
  main,
  authPage,
  authClient,
  authStyles,
  authStart,
  authComplete,
  sharedAuth,
  migration,
  advisorFixMigration,
  confirmationTemplate,
  magicLinkTemplate,
  brandingScript,
  packageText,
  checkout,
] = await Promise.all([
  read('src/main.js'),
  read('src/pages/auth.js'),
  read('src/services/auth.js'),
  read('src/styles/auth.css'),
  read('netlify/functions/auth-login-start.mjs'),
  read('netlify/functions/auth-login-complete.mjs'),
  read('netlify/functions/_shared/auth.mjs'),
  read('supabase/migrations/20260722210000_password_email_signin.sql'),
  read('supabase/migrations/20260722210500_password_email_signin_advisor_fixes.sql'),
  read('supabase/templates/accessrevamp-confirmation.html'),
  read('supabase/templates/accessrevamp-magic-link.html'),
  read('scripts/supabase/apply-auth-branding.mjs'),
  read('package.json'),
  read('netlify/functions/create-checkout.mjs'),
]);

const packageJson = JSON.parse(packageText);

function unsignedJwt(sessionId) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ session_id: sessionId })}.signature`;
}

function authAdmin({ sessionId, verified }) {
  const query = {
    select() { return this; },
    eq() { return this; },
    async maybeSingle() {
      return { data: verified ? { session_id: sessionId } : null, error: null };
    },
  };
  return {
    auth: {
      async getUser() {
        return {
          data: {
            user: {
              id: '11111111-1111-4111-8111-111111111111',
              email: 'owner@example.com',
              email_confirmed_at: '2026-07-22T00:00:00.000Z',
            },
          },
          error: null,
        };
      },
    },
    from(table) {
      assert.equal(table, 'accessrevamp_verified_sessions');
      return query;
    },
  };
}

test('auth pages use the dark AccessRevamp identity system without phone fields', () => {
  assert.match(main, /import '\.\/styles\/auth\.css'/);
  assert.match(authPage, /auth-experience/);
  assert.match(authPage, /Access \/ verified/i);
  assert.match(authPage, /Correct password/);
  assert.match(authPage, /Verify the inbox/);
  assert.match(authPage, /No phone number required/);
  assert.doesNotMatch(authPage, /type="tel"|name="phone"|sms/i);
  assert.match(authStyles, /background:\s*#050608/);
  assert.match(authStyles, /\.site-shell\.auth-page \.site-header\s*\{[\s\S]*?background:\s*rgba\(5,6,8,\.94\)/);
  assert.match(authStyles, /\.site-shell\.auth-page \.nav-actions \.button\s*\{[\s\S]*?background:\s*#bd4838/);
  assert.doesNotMatch(authStyles, /(?:^|\n)\.auth-page \.site-header\s*\{/);
  assert.match(authStyles, /auth-panel/);
  assert.match(authStyles, /var\(--mint\)/);
  assert.match(authStyles, /var\(--signal-coral\)/);
  assert.match(authStyles, /prefers-reduced-motion/);
});

test('signup requires confirmation and every sign-in requires password then email', () => {
  assert.match(authClient, /signUp\(/);
  assert.match(authClient, /emailRedirectTo/);
  assert.match(authClient, /Check your email to confirm/);
  assert.match(authClient, /result\.data\?\.session/);
  assert.match(authClient, /Email confirmation is not enforced/);
  assert.match(authClient, /LOGIN_START_ENDPOINT/);
  assert.match(authClient, /LOGIN_COMPLETE_ENDPOINT/);
  assert.match(authClient, /signOut\(\{ scope: 'local' \}\)/);

  assert.ok(
    authStart.indexOf('signInWithPassword') < authStart.indexOf('signInWithOtp'),
    'password validation must precede the email-link request',
  );
  assert.match(authStart, /shouldCreateUser:\s*false/);
  assert.match(authStart, /accessrevamp_login_challenges/);
  assert.match(authStart, /consume_accessrevamp_auth_attempt/);
  assert.match(authStart, /AUTH_RATE_LIMIT_SECRET/);
  assert.match(authStart, /Too many sign-in attempts/);
  assert.match(authStart, /randomBytes\(32\)/);
  assert.match(authStart, /createHash\('sha256'\)/);
  assert.doesNotMatch(authStart, /return json\([\s\S]*challengeToken/);
  assert.match(authComplete, /requireVerifiedSession:\s*false/);
  assert.match(authComplete, /complete_accessrevamp_email_signin/);
});

test('database rate limiting blocks password validation before credential work begins', async () => {
  const previousOrigins = process.env.ALLOWED_ORIGINS;
  const previousSecret = process.env.AUTH_RATE_LIMIT_SECRET;
  process.env.ALLOWED_ORIGINS = 'https://accessrevamp.test';
  process.env.AUTH_RATE_LIMIT_SECRET = 'auth-rate-limit-secret-at-least-24-chars';
  let passwordCalls = 0;
  const handler = createAuthLoginStartHandler({
    getAdmin: () => ({
      async rpc(name) {
        assert.equal(name, 'consume_accessrevamp_auth_attempt');
        return { data: null, error: { message: 'Authentication rate limit exceeded.' } };
      },
    }),
    createPublicClient: () => ({
      auth: {
        async signInWithPassword() { passwordCalls += 1; return { data: null, error: null }; },
        async signOut() {},
      },
    }),
  });

  try {
    const response = await handler(new Request('https://accessrevamp.test/api/auth-login-start', {
      method: 'POST',
      headers: { origin: 'https://accessrevamp.test', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'WrongPassword!1' }),
    }));
    assert.equal(response.status, 429);
    assert.equal(passwordCalls, 0);
    assert.match(await response.text(), /Too many sign-in attempts/);
  } finally {
    if (previousOrigins == null) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previousOrigins;
    if (previousSecret == null) delete process.env.AUTH_RATE_LIMIT_SECRET;
    else process.env.AUTH_RATE_LIMIT_SECRET = previousSecret;
  }
});

test('customer API authentication requires an application-verified Supabase session', async () => {
  const sessionId = '22222222-2222-4222-8222-222222222222';
  const request = new Request('https://accessrevamp.test/api/account-projects', {
    headers: { authorization: `Bearer ${unsignedJwt(sessionId)}` },
  });

  const verified = await requireConfirmedUser(request, authAdmin({ sessionId, verified: true }));
  assert.equal(verified.sessionId, sessionId);
  assert.equal(verified.email, 'owner@example.com');

  await assert.rejects(
    requireConfirmedUser(request, authAdmin({ sessionId, verified: false })),
    (error) => error.status === 403 && /password and email verification/i.test(error.message),
  );

  const baseSession = await requireConfirmedUser(
    request,
    authAdmin({ sessionId, verified: false }),
    { requireVerifiedSession: false },
  );
  assert.equal(baseSession.sessionId, sessionId);
});

test('verified-session gate remains deterministic under concurrent customer requests', async () => {
  const sessionId = '33333333-3333-4333-8333-333333333333';
  const token = unsignedJwt(sessionId);
  const attempts = Array.from({ length: 250 }, (_, index) => {
    const request = new Request(`https://accessrevamp.test/api/account-projects?attempt=${index}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    return requireConfirmedUser(request, authAdmin({ sessionId, verified: true }));
  });
  const results = await Promise.all(attempts);
  assert.equal(results.length, 250);
  assert.ok(results.every((result) => result.sessionId === sessionId));
});

test('database migration binds verification to auth.sessions and adds restrictive RLS gates', () => {
  assert.match(migration, /create table if not exists public\.accessrevamp_login_challenges/);
  assert.match(migration, /create table if not exists public\.accessrevamp_verified_sessions/);
  assert.match(migration, /session_id uuid primary key references auth\.sessions\(id\) on delete cascade/);
  assert.match(migration, /create or replace function (?:public|accessrevamp_private)\.accessrevamp_session_is_verified/);
  assert.match(migration, /complete_accessrevamp_email_signin/);
  assert.match(migration, /consume_accessrevamp_auth_attempt/);
  assert.match(migration, /v_count >= 25/);
  assert.match(migration, /v_count >= 8/);
  assert.match(migration, /as restrictive/gi);
  for (const table of [
    'profiles',
    'orders',
    'entitlements',
    'customer_projects',
    'refund_requests',
    'project_updates',
    'project_deliveries',
    'project_design_options',
    'project_workflows',
  ]) assert.match(migration, new RegExp(`${table}_verified_session`));
  assert.match(sharedAuth, /accessrevamp_verified_sessions/);
  assert.match(sharedAuth, /session_id/);
  assert.match(advisorFixMigration, /alter function public\.accessrevamp_session_is_verified\(\) set schema accessrevamp_private/);
  assert.match(advisorFixMigration, /accessrevamp_login_challenges_deny_browser/);
  assert.match(advisorFixMigration, /accessrevamp_verified_sessions_deny_browser/);
  assert.match(advisorFixMigration, /for all to anon, authenticated/);
});

test('official AccessRevamp email assets are guarded and management-token driven', () => {
  for (const template of [confirmationTemplate, magicLinkTemplate]) {
    assert.match(template, /AccessRevamp/);
    assert.match(template, /#050608/);
    assert.match(template, /\{\{ \.ConfirmationURL \}\}/);
    assert.doesNotMatch(template, /<script|javascript:/i);
  }
  assert.match(brandingScript, /SUPABASE_ACCESS_TOKEN/);
  assert.match(brandingScript, /mailer_autoconfirm:\s*false/);
  assert.match(brandingScript, /mailer_templates_confirmation_content/);
  assert.match(brandingScript, /mailer_templates_magic_link_content/);
  assert.match(brandingScript, /smtp_sender_name/);
  assert.match(brandingScript, /credentialsPrinted:\s*false/);
  assert.equal(packageJson.scripts['auth:branding:apply'], 'node scripts/supabase/apply-auth-branding.mjs');
  assert.equal(packageJson.scripts['auth:branding:verify'], 'node scripts/supabase/apply-auth-branding.mjs --verify');
});

test('Stripe remains the single payment provider and Shopify is not introduced', () => {
  assert.match(checkout, /import Stripe from 'stripe'/);
  assert.match(checkout, /stripe\.checkout\.sessions\.create/);
  assert.doesNotMatch(`${main}\n${authClient}\n${authStart}\n${packageText}`, /shopify/i);
});
