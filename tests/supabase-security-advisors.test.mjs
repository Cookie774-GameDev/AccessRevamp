import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

async function migrationSource() {
  const directory = new URL('../supabase/migrations/', import.meta.url);
  const files = (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  return Promise.all(files.map((name) => readFile(new URL(name, directory), 'utf8')))
    .then((sources) => sources.join('\n'));
}

test('customer auth RPC wrappers are invoker-safe and privileged work stays private', async () => {
  const migrations = await migrationSource();

  assert.match(migrations, /create or replace function accessrevamp_private\.begin_accessrevamp_email_signin\(\)/i);
  assert.match(migrations, /create or replace function accessrevamp_private\.complete_accessrevamp_email_signin_current\(/i);
  assert.match(migrations, /alter function public\.begin_accessrevamp_email_signin\(\) security invoker/i);
  assert.match(migrations, /alter function public\.complete_accessrevamp_email_signin_current\(text\) security invoker/i);
  assert.match(migrations, /alter function public\.accessrevamp_current_session_is_verified\(\) security invoker/i);
  assert.match(migrations, /revoke all on function accessrevamp_private\.begin_accessrevamp_email_signin\(\)\s+from public, anon/i);
  assert.match(migrations, /grant execute on function accessrevamp_private\.begin_accessrevamp_email_signin\(\)\s+to authenticated/i);
});
