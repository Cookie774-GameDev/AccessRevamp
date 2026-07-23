import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { readJsonBody } from '../netlify/functions/_shared/http.mjs';

const endpoints = [
  'netlify/functions/contact.mjs',
  'netlify/functions/free-snapshot.mjs',
  'netlify/functions/outreach-queue.mjs',
  'netlify/functions/operator-action.mjs',
];

test('JSON mutation endpoints use the parser that measures the actual body bytes', async () => {
  for (const path of endpoints) {
    const source = await readFile(path, 'utf8');
    assert.match(source, /readJsonBody/);
    assert.doesNotMatch(source, /request\.json\(\)/);
  }
});

test('actual JSON body bytes are limited even when Content-Length is absent', async () => {
  const request = new Request('https://accessrevamp.com/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'x'.repeat(16_001) }),
  });
  request.headers.delete('content-length');

  await assert.rejects(
    () => readJsonBody(request),
    (error) => error?.status === 413 && /too large/i.test(error.message),
  );
});

test('JSON mutation parser rejects non-JSON content types before parsing', async () => {
  const request = new Request('https://accessrevamp.com/api/test', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: '{"ok":true}',
  });

  await assert.rejects(
    () => readJsonBody(request),
    (error) => error?.status === 415 && /application\/json/i.test(error.message),
  );
});
