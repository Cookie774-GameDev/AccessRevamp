import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createAuthSignupResendHandler } from '../netlify/functions/auth-signup-resend.mjs';
import { createAuthSignupStartHandler } from '../netlify/functions/auth-signup-start.mjs';

const ORIGIN = 'https://accessrevamp.test';
const EMAIL = 'customer@example.com';
const PASSWORD = 'StrongPassword!234';

function withAuthEnvironment(run) {
  const previousOrigins = process.env.ALLOWED_ORIGINS;
  const previousSecret = process.env.AUTH_RATE_LIMIT_SECRET;
  process.env.ALLOWED_ORIGINS = ORIGIN;
  process.env.AUTH_RATE_LIMIT_SECRET = 'signup-rate-limit-secret-at-least-24-chars';
  return Promise.resolve()
    .then(run)
    .finally(() => {
      if (previousOrigins == null) delete process.env.ALLOWED_ORIGINS;
      else process.env.ALLOWED_ORIGINS = previousOrigins;
      if (previousSecret == null) delete process.env.AUTH_RATE_LIMIT_SECRET;
      else process.env.AUTH_RATE_LIMIT_SECRET = previousSecret;
    });
}

function request(path, body) {
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function adminForState(state) {
  return {
    async rpc(name) {
      if (name === 'consume_accessrevamp_auth_attempt') return { data: null, error: null };
      assert.equal(name, 'accessrevamp_auth_email_state');
      return { data: state, error: null };
    },
  };
}

test('confirmed signup email is routed to sign in instead of claiming an email was sent', async () => {
  await withAuthEnvironment(async () => {
    let publicClientCreated = false;
    const handler = createAuthSignupStartHandler({
      getAdmin: () => adminForState('confirmed'),
      createPublicClient: () => { publicClientCreated = true; return {}; },
    });
    const response = await handler(request('/api/auth-signup-start', {
      fullName: 'Customer Name', email: EMAIL, password: PASSWORD,
    }));
    const body = await response.json();
    assert.equal(response.status, 409);
    assert.equal(body.code, 'ACCOUNT_EXISTS');
    assert.equal(body.next, '/login');
    assert.equal(publicClientCreated, false);
  });
});

test('unconfirmed signup requests a new confirmation email', async () => {
  await withAuthEnvironment(async () => {
    let resendPayload;
    const handler = createAuthSignupStartHandler({
      getAdmin: () => adminForState('unconfirmed'),
      createPublicClient: () => ({
        auth: {
          async resend(payload) { resendPayload = payload; return { data: {}, error: null }; },
          async signOut() {},
        },
      }),
    });
    const response = await handler(request('/api/auth-signup-start', {
      fullName: 'Customer Name', email: EMAIL, password: PASSWORD,
    }));
    assert.equal(response.status, 202);
    assert.equal(resendPayload.type, 'signup');
    assert.equal(resendPayload.email, EMAIL);
    assert.match(resendPayload.options.emailRedirectTo, /accessrevamp\.test\/login\?confirmed=1/);
  });
});

test('new signup creates an unconfirmed account and requests verification', async () => {
  await withAuthEnvironment(async () => {
    let signupPayload;
    const handler = createAuthSignupStartHandler({
      getAdmin: () => adminForState('missing'),
      createPublicClient: () => ({
        auth: {
          async signUp(payload) {
            signupPayload = payload;
            return { data: { user: { identities: [{ provider: 'email' }] }, session: null }, error: null };
          },
          async signOut() {},
        },
      }),
    });
    const response = await handler(request('/api/auth-signup-start', {
      fullName: 'Customer Name', email: EMAIL, password: PASSWORD,
    }));
    assert.equal(response.status, 202);
    assert.equal(signupPayload.email, EMAIL);
    assert.equal(signupPayload.options.data.full_name, 'Customer Name');
  });
});

test('resend refuses to claim success after the account is already confirmed', async () => {
  await withAuthEnvironment(async () => {
    const handler = createAuthSignupResendHandler({
      getAdmin: () => adminForState('confirmed'),
      createPublicClient: () => { throw new Error('should not create client'); },
    });
    const response = await handler(request('/api/auth-signup-resend', { email: EMAIL }));
    const body = await response.json();
    assert.equal(response.status, 409);
    assert.equal(body.code, 'ACCOUNT_EXISTS');
  });
});

test('signup state lookup is server-only and indexed through auth users', async () => {
  const migration = await readFile('supabase/migrations/20260723010000_auth_signup_email_state.sql', 'utf8');
  assert.match(migration, /accessrevamp_auth_email_state/);
  assert.match(migration, /from auth\.users/);
  assert.match(migration, /revoke all[^;]+from public, anon, authenticated/s);
  assert.match(migration, /grant execute[^;]+to service_role/s);
});
