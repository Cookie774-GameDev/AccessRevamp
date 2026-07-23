import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createAuthLoginCompleteHandler } from '../netlify/functions/auth-login-complete.mjs';
import { createAuthLoginStartHandler } from '../netlify/functions/auth-login-start.mjs';

const ORIGIN = 'https://accessrevamp.test';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const CHALLENGE = 'a'.repeat(64);

function unsignedJwt(sessionId = SESSION_ID) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ session_id: sessionId })}.signature`;
}

function withOrigin(run) {
  const previous = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = ORIGIN;
  return Promise.resolve().then(run).finally(() => {
    if (previous == null) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previous;
  });
}

test('password-first login starts with authenticated RPCs and no server-only key', async () => {
  await withOrigin(async () => {
    let publicClientCalls = 0;
    let emailPayload;
    let challengeAccessToken;
    const passwordClient = {
      auth: {
        async signInWithPassword() {
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
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'customer@example.com', password: 'StrongPassword!234' }),
    }));
    const body = await response.json();

    assert.equal(response.status, 202);
    assert.equal(body.ok, true);
    assert.equal(challengeAccessToken, 'password-session-access-token');
    assert.equal(emailPayload.options.shouldCreateUser, false);
    assert.match(emailPayload.options.emailRedirectTo, /^https:\/\/accessrevamp\.test\/login\?verification=/);
    assert.match(response.headers.get('set-cookie') || '', /HttpOnly; SameSite=Strict/);
    assert.doesNotMatch(JSON.stringify(body), new RegExp(CHALLENGE));
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

test('production migration protects customer dashboard records and private files', async () => {
  const [runtimeMigration, designMigration] = await Promise.all([
    readFile('supabase/migrations/20260723023000_public_customer_auth_runtime.sql', 'utf8'),
    readFile('supabase/migrations/20260723030000_customer_design_preview_storage.sql', 'utf8'),
  ]);
  assert.match(runtimeMigration, /begin_accessrevamp_email_signin/);
  assert.match(runtimeMigration, /complete_accessrevamp_email_signin_current/);
  assert.match(runtimeMigration, /accessrevamp_current_session_is_verified/);
  assert.match(runtimeMigration, /project_artifacts_select_own_published_verified/);
  assert.match(runtimeMigration, /customer_private_assets_select_verified/);
  assert.match(designMigration, /project_design_options/);
  assert.match(designMigration, /customer_ready/);
});
