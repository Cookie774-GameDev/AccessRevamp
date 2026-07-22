import test from 'node:test';
import assert from 'node:assert/strict';

import { requireConfirmedUser } from '../netlify/functions/_shared/auth.mjs';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';

function requestWithAuthorization(value) {
  return new Request('https://accessrevamp.test/.netlify/functions/entitlement-quote', {
    headers: value ? { authorization: value } : {},
  });
}

function jwtWithSession(sessionId) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ session_id: sessionId })}.test-signature`;
}

test('confirmed-user boundary requires one strict bearer token', async () => {
  const admin = { auth: { getUser: async () => { throw new Error('must not be called'); } } };

  for (const authorization of [undefined, 'Basic abc', 'Bearer', 'Bearer one two', 'Bearer token,other']) {
    await assert.rejects(
      () => requireConfirmedUser(requestWithAuthorization(authorization), admin),
      (error) => error.status === 401 && /authentication required/i.test(error.message),
    );
  }
});

test('confirmed-user boundary trusts only Supabase getUser verified claims', async () => {
  let receivedToken;
  const filters = [];
  const admin = {
    auth: {
      getUser: async (token) => {
        receivedToken = token;
        return {
          data: {
            user: {
              id: USER_ID,
              email: 'Owner@Example.com',
              email_confirmed_at: '2026-07-18T00:00:00.000Z',
            },
          },
          error: null,
        };
      },
    },
    from(table) {
      assert.equal(table, 'accessrevamp_verified_sessions');
      return {
        select(columns) {
          assert.equal(columns, 'session_id');
          return this;
        },
        eq(column, value) {
          filters.push([column, value]);
          return this;
        },
        async maybeSingle() {
          assert.deepEqual(filters, [['session_id', SESSION_ID], ['user_id', USER_ID]]);
          return { data: { session_id: SESSION_ID }, error: null };
        },
      };
    },
  };
  const token = jwtWithSession(SESSION_ID);

  const user = await requireConfirmedUser(requestWithAuthorization(`Bearer ${token}`), admin);

  assert.equal(receivedToken, token);
  assert.deepEqual(user, {
    id: USER_ID,
    email: 'owner@example.com',
    sessionId: SESSION_ID,
  });
});

test('confirmed-user boundary rejects invalid and unconfirmed identities without leaking claims', async () => {
  const invalid = { auth: { getUser: async () => ({ data: { user: null }, error: new Error('provider detail') }) } };
  await assert.rejects(
    () => requireConfirmedUser(requestWithAuthorization('Bearer rejected.token'), invalid),
    (error) => error.status === 401
      && /authentication required/i.test(error.message)
      && !/provider detail|rejected\.token/i.test(error.message),
  );

  const unconfirmed = {
    auth: {
      getUser: async () => ({
        data: { user: { id: USER_ID, email: 'owner@example.com', email_confirmed_at: null } },
        error: null,
      }),
    },
  };
  await assert.rejects(
    () => requireConfirmedUser(requestWithAuthorization('Bearer unconfirmed.token'), unconfirmed),
    (error) => error.status === 403 && /confirmed/i.test(error.message),
  );
});

test('confirmed-user boundary treats a missing admin client as unavailable configuration', async () => {
  await assert.rejects(
    () => requireConfirmedUser(requestWithAuthorization('Bearer verified.token'), null),
    (error) => error.status === 503 && !/token|service_role|secret/i.test(error.message),
  );
});
