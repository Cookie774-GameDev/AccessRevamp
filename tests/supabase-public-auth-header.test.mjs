import assert from 'node:assert/strict';
import test from 'node:test';
import { createSupabaseAccessTokenClient } from '../netlify/functions/_shared/supabase-public.mjs';

test('OTP completion forwards exactly one bearer token to Supabase Auth', async () => {
  const token = 'header.payload.signature';
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const headers = new Headers(init.headers);
    requests.push({
      url: String(url),
      authorization: headers.get('authorization'),
    });
    return new Response(JSON.stringify({
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'customer@example.com',
        email_confirmed_at: '2026-07-25T00:00:00.000Z',
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const client = createSupabaseAccessTokenClient(token, {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    });
    const result = await client.auth.getUser(token);
    assert.equal(result.error, null);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://example.supabase.co/auth/v1/user');
    assert.equal(requests[0].authorization, `Bearer ${token}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
