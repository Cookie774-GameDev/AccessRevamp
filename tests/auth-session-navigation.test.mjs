import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

test('ordinary auth-page startup preserves an existing persistent session', async () => {
  const auth = await read('src/services/auth.js');
  const startup = auth.slice(auth.indexOf('if (!supabase)'), auth.indexOf('return () =>'));

  assert.match(startup, /getSession\(\)/);
  assert.match(startup, /navigate\('\/account\/projects'/);
  assert.doesNotMatch(startup, /else\s*\{\s*supabase\.auth\.signOut/);
});

test('the shared header exposes mutually exclusive sign-in and profile states', async () => {
  const [shell, controller, main] = await Promise.all([
    read('src/components/shell.js'),
    read('src/services/session-navigation.js'),
    read('src/main.js'),
  ]);

  assert.match(shell, /data-session-signed-out/);
  assert.match(shell, /data-session-signed-in/);
  assert.match(shell, /aria-label="Open your profile"/);
  assert.match(controller, /auth\.getSession\(\)/);
  assert.match(controller, /auth\.onAuthStateChange/);
  assert.match(controller, /\/account\/projects/);
  assert.match(main, /setupSessionNavigation\(router\.navigate\)/);
});
