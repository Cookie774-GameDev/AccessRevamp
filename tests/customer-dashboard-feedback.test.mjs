import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('verified customers can rank designs, request two new rounds, and send special requests in the hub', async () => {
  const [api, service, worker] = await Promise.all([
    read('netlify/functions/account-project-feedback.mjs'),
    read('src/services/account-projects.js'),
    read('worker/index.ts'),
  ]);

  assert.match(api, /requireConfirmedUser/);
  assert.match(api, /submit_accessrevamp_dashboard_feedback/);
  assert.match(api, /selectedOptionIds/);
  assert.match(api, /requestId/);
  assert.match(service, /data-design-feedback-form/);
  assert.match(service, /data-request-more-designs/);
  assert.match(service, /data-special-request-form/);
  assert.match(service, /\/api\/account-project-feedback/);
  assert.match(worker, /\/api\/account-project-feedback/);
});

test('dashboard feedback migration binds every write to auth uid and caps request-more at two', async () => {
  const directory = new URL('../supabase/migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  const migrations = (await Promise.all(files.map((name) => readFile(new URL(name, directory), 'utf8')))).join('\n');

  assert.match(migrations, /create table if not exists public\.customer_project_feedback/i);
  assert.match(migrations, /request_more_count\s*>=\s*2/i);
  assert.match(migrations, /project\.user_id\s*<>\s*v_user_id/i);
  assert.match(migrations, /option\.project_id\s*=\s*p_project_id/i);
  assert.match(migrations, /accessrevamp_private\.submit_accessrevamp_dashboard_feedback/i);
  assert.match(migrations, /public\.submit_accessrevamp_dashboard_feedback/i);
  assert.match(migrations, /security invoker/i);
});
