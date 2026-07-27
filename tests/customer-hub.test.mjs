import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

const [
  auth,
  accountPage,
  accountClient,
  accountFunction,
  ownerServer,
  ownerUi,
  migration,
  styles,
  packageText,
  grantOperator,
] = await Promise.all([
  read('src/services/auth.js'),
  read('src/pages/account-projects.js'),
  read('src/services/account-projects.js'),
  read('netlify/functions/account-projects.mjs'),
  read('scripts/owner-command-center/server.mjs'),
  read('scripts/owner-command-center/ui.mjs'),
  read('supabase/migrations/20260722190000_customer_delivery_hub.sql'),
  read('src/styles/customer-hub.css'),
  read('package.json'),
  read('scripts/grant-operator.mjs'),
]);
const packageJson = JSON.parse(packageText);

test('confirmed email accounts land in the private customer hub', () => {
  assert.match(auth, /navigate\('\/account\/projects'/);
  assert.match(accountPage, /Project workspace/);
  assert.match(accountPage, /<h1>Dashboard<\/h1>/i);
  assert.match(accountClient, /\/api\/account-projects/);
  assert.match(accountClient, /authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(accountClient, /Project updates/);
  assert.match(accountClient, /Project questions and references/);
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

test('owner creative review stays local and keeps delivery approval separate', () => {
  assert.match(ownerServer, /127\.0\.0\.1/);
  assert.match(ownerServer, /request_accessrevamp_creative_changes/);
  assert.match(ownerServer, /approve_accessrevamp_creative_design/);
  assert.match(ownerServer, /approve_accessrevamp_creative_delivery/);
  assert.match(ownerUi, /Customer delivery requires its own explicit approval/);
  assert.doesNotMatch(ownerUi, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
});

test('operator bootstrap requires an existing confirmed owner and server credentials', () => {
  assert.equal(packageJson.scripts['operator:grant'], 'node scripts/grant-operator.mjs');
  assert.match(grantOperator, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(grantOperator, /auth\.admin\.listUsers/);
  assert.match(grantOperator, /email_confirmed_at/);
  assert.match(grantOperator, /accessrevamp_operators/);
  assert.doesNotMatch(grantOperator, /signUp\(|createUser\(/);
});

test('customer hub migration keeps storage private and browser access owner-scoped', () => {
  assert.match(migration, /create table if not exists public\.project_updates/);
  assert.match(migration, /project_updates_select_own_published/);
  assert.match(migration, /project\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /revoke all on table public\.project_updates from public, anon, authenticated/);
  assert.match(migration, /grant select on table public\.project_updates to authenticated/);
  assert.match(migration, /'customer-project-artifacts'/);
  assert.match(migration, /52428800/);
  assert.match(migration, /false,\r?\n  52428800/);
  assert.match(migration, /security definer/);
  assert.match(migration, /grant execute on function public\.operator_finalize_project_artifact/);
  assert.match(styles, /\.customer-project/);
  assert.match(styles, /\.customer-project/);
});
