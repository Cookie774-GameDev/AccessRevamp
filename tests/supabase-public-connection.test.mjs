import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const PROJECT_URL = 'https://vbkkimvedmklebghtkzs.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_WD8hNud9SZMDg6uK0N2cAA_4hnxz2ta';

const [config, publicClient, adminClient, envExample, netlifyExample] = await Promise.all([
  readFile('src/config.js', 'utf8'),
  readFile('netlify/functions/_shared/supabase-public.mjs', 'utf8'),
  readFile('netlify/functions/_shared/supabase-admin.mjs', 'utf8'),
  readFile('.env.example', 'utf8'),
  readFile('.env.netlify.example', 'utf8'),
]);

test('browser authentication cannot ship disconnected when optional Vite variables are absent', () => {
  assert.match(config, new RegExp(PROJECT_URL.replaceAll('.', '\\.')));
  assert.match(config, new RegExp(PUBLISHABLE_KEY));
  assert.match(config, /VITE_SUPABASE_URL\s*\|\|\s*DEFAULT_SUPABASE_URL/);
  assert.match(config, /VITE_SUPABASE_PUBLISHABLE_KEY[\s\S]*DEFAULT_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(config, /supabaseUrl:\s*supabaseUrl\.replace/);
  assert.match(config, /supabaseKey,/);
  assert.doesNotMatch(config, /SERVICE_ROLE|sb_secret_/i);
});

test('password verification functions use the same public Supabase project without embedding a server secret', () => {
  assert.match(publicClient, new RegExp(PROJECT_URL.replaceAll('.', '\\.')));
  assert.match(publicClient, new RegExp(PUBLISHABLE_KEY));
  assert.match(publicClient, /SUPABASE_PUBLISHABLE_KEY[\s\S]*DEFAULT_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(publicClient, /SERVICE_ROLE|sb_secret_/i);

  assert.match(adminClient, new RegExp(PROJECT_URL.replaceAll('.', '\\.')));
  assert.match(adminClient, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(adminClient, new RegExp(PUBLISHABLE_KEY));
});

test('deployment examples identify the connected public project while leaving every secret blank', () => {
  for (const example of [envExample, netlifyExample]) {
    assert.match(example, new RegExp(`VITE_SUPABASE_URL=${PROJECT_URL.replaceAll('.', '\\.')}`));
    assert.match(example, new RegExp(`VITE_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE_KEY}`));
    assert.match(example, /SUPABASE_SERVICE_ROLE_KEY=\n/);
    assert.match(example, /AUTH_RATE_LIMIT_SECRET=\n/);
    assert.doesNotMatch(example, /SUPABASE_SERVICE_ROLE_KEY=\S+/);
  }
});
