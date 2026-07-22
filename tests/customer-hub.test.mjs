import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

const [
  auth,
  accountPage,
  accountClient,
  accountFunction,
  operatorClient,
  operatorFunction,
  operatorRoute,
  migration,
  styles,
] = await Promise.all([
  read('src/services/auth.js'),
  read('src/pages/account-projects.js'),
  read('src/services/account-projects.js'),
  read('netlify/functions/account-projects.mjs'),
  read('src/services/operator.js'),
  read('netlify/functions/operator-overview.mjs'),
  read('app/api/operator-overview/route.ts'),
  read('supabase/migrations/20260722190000_customer_delivery_hub.sql'),
  read('src/styles/customer-hub.css'),
]);

test('confirmed email accounts land in the private customer hub', () => {
  assert.match(auth, /navigate\('\/account\/projects'\)/);
  assert.match(accountPage, /Secure customer hub/);
  assert.match(accountPage, /project, designs, and downloads/i);
  assert.match(accountClient, /\/api\/account-projects/);
  assert.match(accountClient, /authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(accountClient, /Project updates/);
  assert.match(accountClient, /Your brief and references/);
  assert.match(accountClient, /Designs for review/);
  assert.match(accountClient, /Files and website downloads/);
  assert.doesNotMatch(accountClient, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
});

test('customer workspace aggregates only owned records and returns expiring private links', () => {
  assert.match(accountFunction, /requireConfirmedUser/);
  assert.match(accountFunction, /\.eq\('user_id', user\.id\)/);
  assert.match(accountFunction, /project_updates/);
  assert.match(accountFunction, /project_intake_assets/);
  assert.match(accountFunction, /project_design_options/);
  assert.match(accountFunction, /project_artifacts/);
  assert.match(accountFunction, /project_deliveries/);
  assert.match(accountFunction, /createSignedUrl/);
  assert.match(accountFunction, /SIGNED_URL_SECONDS\s*=\s*15\s*\*\s*60/);
  assert.match(accountFunction, /CUSTOMER_ARTIFACT_STATUSES\s*=\s*\['approved', 'delivered'\]/);
  assert.doesNotMatch(accountFunction, /storage_path:\s*artifact\.storage_path/);
});

test('operator publishing uses direct signed uploads and atomic database publication', () => {
  assert.match(operatorFunction, /requireOperator/);
  assert.match(operatorFunction, /assertSameOrigin/);
  assert.match(operatorFunction, /createSignedUploadUrl/);
  assert.match(operatorFunction, /operator_finalize_project_artifact/);
  assert.match(operatorFunction, /operator_publish_project_update/);
  assert.match(operatorFunction, /cancel_artifact_upload/);
  assert.match(operatorFunction, /MAX_FILE_BYTES\s*=\s*50\s*\*\s*1024\s*\*\s*1024/);
  assert.match(operatorClient, /uploadToSignedUrl/);
  assert.match(operatorClient, /Creating a private upload slot/);
  assert.match(operatorClient, /Upload and publish/);
  assert.match(operatorRoute, /export const POST/);
  assert.doesNotMatch(operatorClient, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
});

test('customer hub migration keeps storage private and browser access owner-scoped', () => {
  assert.match(migration, /create table if not exists public\.project_updates/);
  assert.match(migration, /project_updates_select_own_published/);
  assert.match(migration, /project\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /revoke all on table public\.project_updates from public, anon, authenticated/);
  assert.match(migration, /grant select on table public\.project_updates to authenticated/);
  assert.match(migration, /'customer-project-artifacts'/);
  assert.match(migration, /52428800/);
  assert.match(migration, /false,\n  52428800/);
  assert.match(migration, /security definer/);
  assert.match(migration, /grant execute on function public\.operator_finalize_project_artifact/);
  assert.match(styles, /\.customer-project/);
  assert.match(styles, /\.operator-publish-grid/);
});
