import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('production builds fingerprint the entry bundle with the commit SHA', async () => {
  const [entry, deployWorkflow, ciWorkflow] = await Promise.all([
    read('src/main.js'),
    read('.github/workflows/deploy-cloudflare-worker.yml'),
    read('.github/workflows/production-ci.yml'),
  ]);

  assert.match(entry, /import\.meta\.env\.VITE_RELEASE_SHA/);
  assert.match(entry, /document\.documentElement\.dataset\.release/);
  assert.match(deployWorkflow, /VITE_RELEASE_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/);
  assert.match(ciWorkflow, /VITE_RELEASE_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/);
});
