import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [script, packageJson] = await Promise.all([
  readFile('scripts/customers/import-shopify-source-assets.mjs', 'utf8'),
  readFile('package.json', 'utf8'),
]);

test('Shopify source import verifies project identity and exact product assets', () => {
  assert.match(script, /customer_projects/);
  assert.match(script, /products\.json\?limit=250/);
  assert.match(script, /project_source_assets/);
  assert.match(script, /product_identifier/);
  assert.match(script, /createHash\('sha256'\)/);
  assert.match(script, /timingSafeEqual/);
  assert.match(script, /public_permission/);
  assert.match(script, /verification_status:\s*'verified'/);
  assert.match(script, /credentialsPrinted:\s*false/);
  assert.match(packageJson, /customers:import-shopify-assets/);
});

test('Shopify source import does not weaken host or transport boundaries', () => {
  assert.match(script, /https:/);
  assert.match(script, /projectHost !== requestedHost/);
  assert.match(script, /redirect:\s*'error'/);
  assert.doesNotMatch(script, /console\.log\([^)]*(?:serviceRoleKey|SUPABASE_SERVICE_ROLE_KEY)/);
});
