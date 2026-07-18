import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Sites catch-all renders the existing AccessRevamp browser application', async () => {
  const [page, clientShell] = await Promise.all([
    readFile('app/[[...slug]]/page.tsx', 'utf8'),
    readFile('app/accessrevamp-client.tsx', 'utf8'),
  ]);

  assert.match(page, /AccessRevampClient/);
  assert.match(clientShell, /id="app"/);
  assert.match(clientShell, /import\("\.\.\/src\/main\.js"\)/);
});

test('Sites metadata describes the finished AccessRevamp experience', async () => {
  const layout = await readFile('app/layout.tsx', 'utf8');

  assert.match(layout, /AccessRevamp/);
  assert.match(layout, /Evidence-led website revamps/);
  assert.doesNotMatch(layout, /codex-preview|site-creator-vinext-starter/);
});
