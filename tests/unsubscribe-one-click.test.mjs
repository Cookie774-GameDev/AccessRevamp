import assert from 'node:assert/strict';
import test from 'node:test';

import { readUnsubscribeToken } from '../netlify/functions/unsubscribe.mjs';

const token = 'a'.repeat(48);

test('manual unsubscribe GET reads the opaque token from the URL', async () => {
  const request = new Request(`https://accessrevamp.com/api/unsubscribe?token=${token}`);
  assert.equal(await readUnsubscribeToken(request), token);
});

test('one-click unsubscribe accepts the standard form POST with the token in the URL', async () => {
  const request = new Request(`https://accessrevamp.com/api/unsubscribe?token=${token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'List-Unsubscribe=One-Click',
  });
  assert.equal(await readUnsubscribeToken(request), token);
});

test('legacy JSON unsubscribe requests remain bounded and supported', async () => {
  const request = new Request('https://accessrevamp.com/api/unsubscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  assert.equal(await readUnsubscribeToken(request), token);
});

test('unsubscribe rejects oversized form bodies without relying on Content-Length', async () => {
  const request = new Request(`https://accessrevamp.com/api/unsubscribe?token=${token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `List-Unsubscribe=One-Click&padding=${'x'.repeat(4_096)}`,
  });
  request.headers.delete('content-length');

  await assert.rejects(
    () => readUnsubscribeToken(request),
    (error) => error?.status === 413 && /too large/i.test(error.message),
  );
});

test('unsubscribe rejects unsupported POST content types', async () => {
  const request = new Request(`https://accessrevamp.com/api/unsubscribe?token=${token}`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'List-Unsubscribe=One-Click',
  });

  await assert.rejects(
    () => readUnsubscribeToken(request),
    (error) => error?.status === 415,
  );
});
