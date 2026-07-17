import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  'supabase/migrations/202607170006_revoke_trigger_function_execution.sql',
  'utf8',
);

test('internal security-definer trigger functions are not browser-callable', () => {
  assert.match(
    sql,
    /revoke all on function public\.handle_accessrevamp_user\(\)[\s\S]*from public, anon, authenticated/,
  );
  assert.match(
    sql,
    /revoke all on function public\.enforce_accessrevamp_outreach\(\)[\s\S]*from public, anon, authenticated/,
  );
});

test('server role retains explicit maintenance access', () => {
  assert.match(
    sql,
    /grant execute on function public\.handle_accessrevamp_user\(\)[\s\S]*to service_role/,
  );
  assert.match(
    sql,
    /grant execute on function public\.enforce_accessrevamp_outreach\(\)[\s\S]*to service_role/,
  );
});
