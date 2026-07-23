import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { requireConfirmedUser } from '../netlify/functions/_shared/auth.mjs';
import { createAuthLoginCompleteHandler } from '../netlify/functions/auth-login-complete.mjs';
import {
  createAuthLoginStartHandler,
  createLocalAuthLimiter,
} from '../netlify/functions/auth-login-start.mjs';

const ORIGIN = 'https://accessrevamp.test';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const CHALLENGE = 'a'.repeat(64);

function unsignedJwt(sessionId = SESSION_ID) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ session_id: sessionId })}.signature`;
}

function withOrigin(run) {
  const previousOrigin = process.env.ALLOWED_ORIGINS;
  const previousSecret = process.env.AUTH_RATE_LIMIT_SECRET;
  process.env.ALLOWED_ORIGINS = ORIGIN;
  process.env.AUTH_RATE_LIMIT_SECRET = 'isolated-auth-rate-limit-secret-32-characters';
  return Promise.resolve().then(run).finally(() => {
    if (previousOrigin == null) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previousOrigin;
    if (previousSecret == null) delete process.env.AUTH_RATE_LIMIT_SECRET;
    else process.env.AUTH_RATE_LIMIT_SECRET = previousSecret;
  });
}

function rateLimitRequest(ip) {
  return new Request(`${ORIGIN}/api/auth-login-start`, {
    headers: { 'x-nf-client-connection-ip': ip },
  });
}

test('password-first login rate-limits locally before credential work without a privileged public RPC', async () => {
  await withOrigin(async () => {
    let publicClientCalls = 0;
    let emailPayload;
    let challengeAccessToken;
    const sequence = [];
    const fallbackLimiter = createLocalAuthLimiter();
    const passwordClient = {
      auth: {
        async signInWithPassword() {
          sequence.push('password');
          return {
            data: {
              user: {
                id: USER_ID,
                email: 'customer@example.com',
                email_confirmed_at: '2026-07-23T00:00:00.000Z',
              },
              session: { access_token: 'password-session-access-token' },
            },
            error: null,
          };
        },
        async signOut() {},
      },
    };
    const emailClient = {
      auth: {
        async signInWithOtp(payload) {
          emailPayload = payload;
          return { data: {}, error: null };
        },
      },
    };
    const handler = createAuthLoginStartHandler({
      getAdmin: () => null,
      consumeLocalAttempt(request, email) {
        sequence.push('rate-limit');
        fallbackLimiter(request, email);
      },
      createPublicClient: () => (publicClientCalls++ === 0 ? passwordClient : emailClient),
      createAccessTokenClient: (accessToken) => {
        challengeAccessToken = accessToken;
        return {
          async rpc(name) {
            assert.equal(name, 'begin_accessrevamp_email_signin');
            return { data: CHALLENGE, error: null };
          },
        };
      },
    });

    const response = await handler(new Request(`${ORIGIN}/api/auth-login-start`, {
      method: 'POST',
      headers: {
        origin: ORIGIN,
        'content-type': 'application/json',
        'x-nf-client-connection-ip': '203.0.113.42',
      },
      body: JSON.stringify({ email: 'customer@example.com', password: 'StrongPassword!234' }),
    }));
    const body = await response.json();

    assert.equal(response.status, 202);
    assert.equal(body.ok, true);
    assert.deepEqual(sequence, ['rate-limit', 'password']);
    assert.equal(challengeAccessToken, 'password-session-access-token');
    assert.equal(emailPayload.options.shouldCreateUser, false);
    assert.match(emailPayload.options.emailRedirectTo, /^https:\/\/accessrevamp\.test\/login\?verification=/);
    assert.match(response.headers.get('set-cookie') || '', /HttpOnly; SameSite=Strict/);
    assert.doesNotMatch(JSON.stringify(body), new RegExp(CHALLENGE));
  });
});

test('local auth limiter resets expired windows and fails closed at bounded capacity', () => {
  let currentTime = 1_000_000;
  const limiter = createLocalAuthLimiter({
    now: () => currentTime,
    windowMs: 1_000,
    capacity: 4,
    ipMaximum: 2,
    accountMaximum: 2,
  });
  const first = rateLimitRequest('203.0.113.10');

  limiter(first, 'one@example.com');
  limiter(first, 'one@example.com');
  assert.throws(
    () => limiter(first, 'one@example.com'),
    (error) => error?.status === 429,
  );

  currentTime += 1_001;
  limiter(first, 'one@example.com');
  limiter(rateLimitRequest('203.0.113.11'), 'two@example.com');
  assert.throws(
    () => limiter(rateLimitRequest('203.0.113.12'), 'three@example.com'),
    (error) => error?.status === 429,
  );
});

test('local auth limiter remains bounded during high-cardinality abuse', () => {
  const limiter = createLocalAuthLimiter({ capacity: 128 });
  let accepted = 0;
  let rejected = 0;

  for (let index = 0; index < 2_000; index += 1) {
    const ip = `198.51.${Math.floor(index / 256)}.${index % 256}`;
    try {
      limiter(rateLimitRequest(ip), `attacker-${index}@example.test`);
      accepted += 1;
    } catch (error) {
      assert.equal(error?.status, 429);
      rejected += 1;
    }
  }

  assert.equal(accepted, 64);
  assert.equal(rejected, 1_936);
});

test('service-scoped customer checks fall back to the verified-session row', async () => {
  await withOrigin(async () => {
    const query = {
      select() { return this; },
      eq() { return this; },
      async maybeSingle() {
        return { data: { session_id: SESSION_ID }, error: null };
      },
    };
    const client = {
      auth: {
        async getUser() {
          return {
            data: {
              user: {
                id: USER_ID,
                email: 'customer@example.com',
                email_confirmed_at: '2026-07-23T00:00:00.000Z',
              },
            },
            error: null,
          };
        },
      },
      async rpc(name) {
        assert.equal(name, 'accessrevamp_current_session_is_verified');
        return { data: false, error: null };
      },
      from(table) {
        assert.equal(table, 'accessrevamp_verified_sessions');
        return query;
      },
    };

    const user = await requireConfirmedUser(new Request(`${ORIGIN}/api/account-projects`, {
      headers: { authorization: `Bearer ${unsignedJwt()}` },
    }), client);

    assert.equal(user.id, USER_ID);
    assert.equal(user.sessionId, SESSION_ID);
  });
});

test('email completion binds the current session to the password challenge without a server-only key', async () => {
  await withOrigin(async () => {
    let completionPayload;
    const handler = createAuthLoginCompleteHandler({
      createAccessTokenClient: () => ({
        auth: {
          async getUser() {
            return {
              data: {
                user: {
                  id: USER_ID,
                  email: 'customer@example.com',
                  email_confirmed_at: '2026-07-23T00:00:00.000Z',
                },
              },
              error: null,
            };
          },
        },
        async rpc(name, payload) {
          assert.equal(name, 'complete_accessrevamp_email_signin_current');
          completionPayload = payload;
          return { data: { verified: true, verified_at: '2026-07-23T00:01:00.000Z' }, error: null };
        },
      }),
    });

    const response = await handler(new Request(`${ORIGIN}/api/auth-login-complete`, {
      method: 'POST',
      headers: {
        origin: ORIGIN,
        authorization: `Bearer ${unsignedJwt()}`,
        cookie: `accessrevamp_login_challenge=${CHALLENGE}`,
        'content-type': 'application/json',
      },
      body: '{}',
    }));

    assert.equal(response.status, 200);
    assert.equal(completionPayload.p_challenge_token, CHALLENGE);
    assert.match(response.headers.get('set-cookie') || '', /Max-Age=0/);
  });
});

test('service-key-free email completion remains deterministic under concurrency', async () => {
  await withOrigin(async () => {
    const handler = createAuthLoginCompleteHandler({
      createAccessTokenClient: () => ({
        auth: {
          async getUser() {
            return {
              data: {
                user: {
                  id: USER_ID,
                  email: 'customer@example.com',
                  email_confirmed_at: '2026-07-23T00:00:00.000Z',
                },
              },
              error: null,
            };
          },
        },
        async rpc() {
          return { data: { verified: true, verified_at: '2026-07-23T00:01:00.000Z' }, error: null };
        },
      }),
    });

    const responses = await Promise.all(Array.from({ length: 100 }, () => handler(new Request(
      `${ORIGIN}/api/auth-login-complete`,
      {
        method: 'POST',
        headers: {
          origin: ORIGIN,
          authorization: `Bearer ${unsignedJwt()}`,
          cookie: `accessrevamp_login_challenge=${CHALLENGE}`,
          'content-type': 'application/json',
        },
        body: '{}',
      },
    ))));

    assert.equal(responses.length, 100);
    assert.ok(responses.every((response) => response.status === 200));
  });
});

test('production migrations protect customer records and keep auth limits service-only', async () => {
  const [
    runtimeMigration,
    designMigration,
    retiredPublicLimiterMigration,
    correctiveLimiterMigration,
    emailAmrMigration,
    authRuntime,
  ] = await Promise.all([
    readFile('supabase/migrations/20260723023000_public_customer_auth_runtime.sql', 'utf8'),
    readFile('supabase/migrations/20260723030000_customer_design_preview_storage.sql', 'utf8'),
    readFile('supabase/migrations/20260723033000_public_auth_rate_limiter.sql', 'utf8'),
    readFile('supabase/migrations/20260723034500_lock_auth_rate_limiter_to_service_role.sql', 'utf8'),
    readFile('supabase/migrations/20260723044000_require_email_otp_for_verified_sessions.sql', 'utf8'),
    readFile('netlify/functions/auth-login-start.mjs', 'utf8'),
  ]);
  assert.match(runtimeMigration, /begin_accessrevamp_email_signin/);
  assert.match(runtimeMigration, /complete_accessrevamp_email_signin_current/);
  assert.match(runtimeMigration, /auth\.jwt\(\)\s*->\s*'amr'/);
  assert.match(runtimeMigration, /factor\s*->>\s*'method'\s+in\s*\('otp',\s*'magiclink'\)/);
  assert.match(runtimeMigration, /Email verification is required/);
  assert.match(runtimeMigration, /accessrevamp_current_session_is_verified/);
  assert.match(runtimeMigration, /project_artifacts_select_own_published_verified/);
  assert.match(runtimeMigration, /customer_private_assets_select_verified/);
  assert.match(designMigration, /project_design_options/);
  assert.match(designMigration, /customer_ready/);
  assert.match(retiredPublicLimiterMigration, /drop function if exists public\.consume_accessrevamp_public_auth_attempt/);
  assert.match(correctiveLimiterMigration, /revoke all on function public\.consume_accessrevamp_auth_attempt/);
  assert.match(correctiveLimiterMigration, /to service_role/);
  assert.match(emailAmrMigration, /create or replace function public\.complete_accessrevamp_email_signin_current/);
  assert.match(emailAmrMigration, /auth\.jwt\(\)\s*->\s*'amr'/);
  assert.match(emailAmrMigration, /factor\s*->>\s*'method'\s+in\s*\('otp',\s*'magiclink'\)/);
  assert.doesNotMatch(authRuntime, /consume_accessrevamp_public_auth_attempt/);
  assert.doesNotMatch(
    `${retiredPublicLimiterMigration}\n${correctiveLimiterMigration}`,
    /grant\s+execute\s+on\s+function\s+public\.consume_accessrevamp_(?:public_)?auth_attempt[\s\S]{0,120}\bto\s+(?:anon|authenticated)/i,
  );
});
