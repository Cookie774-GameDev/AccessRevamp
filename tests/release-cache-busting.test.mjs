import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('production builds fingerprint the entry bundle with the commit SHA', async () => {
  const [entry, marker, stampScript, packageJson, deployWorkflow, ciWorkflow] = await Promise.all([
    read('src/main.js'),
    read('src/release-marker.js'),
    read('scripts/stamp-release.mjs'),
    read('package.json'),
    read('.github/workflows/deploy-cloudflare-worker.yml'),
    read('.github/workflows/production-ci.yml'),
  ]);

  assert.match(entry, /import\s*\{\s*ACCESSREVAMP_RELEASE\s*\}\s*from\s*['"]\.\/release-marker\.js['"]/);
  assert.match(entry, /document\.documentElement\.dataset\.release/);
  assert.match(marker, /ACCESSREVAMP_RELEASE\s*=\s*['"]local['"]/);
  assert.match(stampScript, /process\.env\.VITE_RELEASE_SHA\s*\|\|\s*process\.env\.GITHUB_SHA/);
  assert.match(stampScript, /writeFile\(markerUrl/);
  assert.match(packageJson, /"build":\s*"node scripts\/stamp-release\.mjs && vinext build/);
  assert.match(deployWorkflow, /VITE_RELEASE_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/);
  assert.match(ciWorkflow, /VITE_RELEASE_SHA:\s*\$\{\{\s*github\.sha\s*\}\}/);
});
