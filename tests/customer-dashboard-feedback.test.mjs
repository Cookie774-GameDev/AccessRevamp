import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { createAccountProjectFeedbackHandler } from '../netlify/functions/account-project-feedback.mjs';
import { renderWorkspace } from '../src/services/customer-workspace-renderer.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const ORIGIN = 'https://accessrevamp.test';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ID = '33333333-3333-4333-8333-333333333333';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';
const OPTION_NORMAL_ID = '55555555-5555-4555-8555-555555555555';
const OPTION_CINEMATIC_ID = '66666666-6666-4666-8666-666666666666';
const OPTION_NORMAL_TWO_ID = '77777777-7777-4777-8777-777777777777';

function unsignedJwt() {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ session_id: SESSION_ID })}.signature`;
}

function feedbackRequest(accessToken = unsignedJwt()) {
  return new Request(`${ORIGIN}/api/account-project-feedback`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      origin: ORIGIN,
    },
    body: JSON.stringify({
      action: 'select_designs',
      projectId: PROJECT_ID,
      requestId: REQUEST_ID,
      optionGroup: 'homepage',
      selectedOptionIds: [OPTION_NORMAL_ID, OPTION_CINEMATIC_ID],
      revisionRound: 1,
      notes: '',
    }),
  });
}

test('feedback writes through the validated caller token instead of the service role', async () => {
  const accessToken = unsignedJwt();
  let callerToken = '';
  let callerPayload;
  const admin = {
    auth: {
      async getUser(token) {
        assert.equal(token, accessToken);
        return {
          data: {
            user: {
              id: USER_ID,
              email: 'owner@example.com',
              email_confirmed_at: '2026-07-27T12:00:00.000Z',
            },
          },
          error: null,
        };
      },
    },
    async rpc(name) {
      assert.equal(name, 'accessrevamp_current_session_is_verified');
      return { data: false, error: null };
    },
    from(table) {
      assert.equal(table, 'accessrevamp_verified_sessions');
      const filters = [];
      return {
        select() { return this; },
        eq(column, value) {
          filters.push([column, value]);
          return this;
        },
        async maybeSingle() {
          assert.deepEqual(filters, [
            ['session_id', SESSION_ID],
            ['user_id', USER_ID],
          ]);
          return { data: { session_id: SESSION_ID }, error: null };
        },
      };
    },
  };
  const handler = createAccountProjectFeedbackHandler({
    getClient: () => admin,
    createCallerClient(token) {
      callerToken = token;
      return {
        async rpc(name, payload) {
          assert.equal(name, 'submit_accessrevamp_dashboard_feedback');
          callerPayload = payload;
          return { data: { ok: true, duplicate: false }, error: null };
        },
      };
    },
  });

  const response = await handler(feedbackRequest(accessToken));

  assert.equal(response.status, 201);
  assert.equal(callerToken, accessToken);
  assert.deepEqual(callerPayload, {
    p_project_id: PROJECT_ID,
    p_request_id: REQUEST_ID,
    p_action: 'select_designs',
    p_option_group: 'homepage',
    p_selected_option_ids: [OPTION_NORMAL_ID, OPTION_CINEMATIC_ID],
    p_notes: null,
    p_revision_round: 1,
  });
  assert.equal(Object.hasOwn(callerPayload, 'p_user_id'), false);
});

test('homepage chooser renders both homepage variants under the canonical group', () => {
  const project = {
    id: PROJECT_ID,
    name: 'Mixed homepage review',
    plan_key: 'complete_revamp',
    status: 'client_review',
    progress_percent: 85,
    workflow: { current_stage: 'client_review', tasks: [] },
    feedback: [],
    artifacts: [],
    deliveries: [],
    findings: [],
    design_options: [
      {
        id: OPTION_NORMAL_ID,
        option_group: 'homepage_normal',
        option_number: 1,
        revision_round: 1,
        preview_url: 'https://assets.example/normal.webp',
      },
      {
        id: OPTION_CINEMATIC_ID,
        option_group: 'homepage_cinematic',
        option_number: 2,
        revision_round: 1,
        preview_url: 'https://assets.example/cinematic.webp',
      },
      {
        id: OPTION_NORMAL_TWO_ID,
        option_group: 'homepage_normal',
        option_number: 3,
        revision_round: 1,
        preview_url: 'https://assets.example/normal-two.webp',
      },
    ],
  };

  const html = renderWorkspace(
    { projects: [project] },
    PROJECT_ID,
    'projects',
    'website',
    {
      designChooser: {
        open: true,
        rankedOptionIds: [OPTION_NORMAL_ID, OPTION_CINEMATIC_ID, OPTION_NORMAL_TWO_ID],
      },
    },
  );

  assert.match(html, new RegExp(`data-design-preview-open="${OPTION_NORMAL_ID}"`));
  assert.match(html, new RegExp(`data-design-preview-open="${OPTION_CINEMATIC_ID}"`));
  assert.match(html, /data-option-group="homepage"/);
});

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

test('canonical homepage feedback migration rejects invalid option boundaries', async () => {
  const directory = new URL('../supabase/migrations/', import.meta.url);
  const names = (await readdir(directory))
    .filter((name) => name === '20260728010000_canonical_homepage_feedback.sql');
  assert.equal(names.length, 1);
  const migration = await readFile(new URL(names[0], directory), 'utf8');

  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /accessrevamp_session_is_verified\(\)/i);
  assert.match(migration, /v_project\.user_id <> v_user_id/i);
  assert.match(migration, /p_option_group <> 'homepage'/i);
  assert.match(migration, /count\(distinct selected_id\)/i);
  assert.match(migration, /option\.project_id = p_project_id/i);
  assert.match(migration, /option\.option_group in \(\s*'homepage_normal',\s*'homepage_cinematic'\s*\)/i);
  assert.match(migration, /option\.revision_round = p_revision_round/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /revoke all on function accessrevamp_private\.submit_accessrevamp_dashboard_feedback[\s\S]+from public, anon, authenticated/i);
});
