import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [ci, deploy, packageText] = await Promise.all([
  readFile('.github/workflows/production-ci.yml', 'utf8'),
  readFile('.github/workflows/deploy-cloudflare-worker.yml', 'utf8'),
  readFile('package.json', 'utf8'),
]);

test('Cloudflare production auth is verified after the immutable Worker deploy', () => {
  const packageJson = JSON.parse(packageText);
  assert.equal(
    packageJson.scripts['verify:production-auth'],
    'node scripts/quality/verify-netlify-auth-preview.mjs',
  );
  assert.doesNotMatch(ci, /deploy-preview-\$\{\{ github\.event\.pull_request\.number \}\}--accessrevamp\.netlify\.app/);
  assert.doesNotMatch(ci, /Netlify authentication preview/);
  assert.match(deploy, /Deploy production Worker[\s\S]+Verify deployed production authentication/);
  assert.match(deploy, /NETLIFY_AUTH_TARGET:\s*"https:\/\/accessrevamp\.com"/);
  assert.match(deploy, /REQUIRE_SERVER_AUTH:\s*"true"/);
  assert.match(deploy, /npm run verify:production-auth/);
});
