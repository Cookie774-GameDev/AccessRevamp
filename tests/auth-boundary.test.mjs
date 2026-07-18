import test from 'node:test';
import assert from 'node:assert/strict';

import { requireConfirmedUser } from '../netlify/functions/_shared/auth.mjs';

function requestWithAuthorization(value) {
  return new Request('https://accessrevamp.test/.netlify/functions/entitlement-quote', {
    headers: value ? { authorization: value } : {},
  });
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
  const admin = {
    auth: {
      getUser: async (token) => {
        receivedToken = token;
        return {
          data: {
            user: {
              id: '11111111-1111-4111-8111-111111111111',
              email: 'Owner@Example.com',
              email_confirmed_at: '2026-07-18T00:00:00.000Z',
            },
          },
          error: null,
        };
      },
    },
  };

  const user = await requireConfirmedUser(requestWithAuthorization('Bearer verified.token-value'), admin);

  assert.equal(receivedToken, 'verified.token-value');
  assert.deepEqual(user, {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'owner@example.com',
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
        data: { user: { id: '11111111-1111-4111-8111-111111111111', email: 'owner@example.com', email_confirmed_at: null } },
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
