import assert from 'node:assert/strict';
import test from 'node:test';

const workerEnvironment = await import('../worker/environment.mjs').catch(() => ({}));

test('Worker installs only string bindings into the server process environment', () => {
  assert.equal(typeof workerEnvironment.installWorkerEnvironment, 'function');

  const target = {};
  workerEnvironment.installWorkerEnvironment({
    SUPABASE_URL: 'https://project.supabase.co',
    STRIPE_EXPECT_LIVEMODE: 'true',
    ASSETS: { fetch() {} },
  }, target);

  assert.deepEqual(target, {
    SUPABASE_URL: 'https://project.supabase.co',
    STRIPE_EXPECT_LIVEMODE: 'true',
  });
});
