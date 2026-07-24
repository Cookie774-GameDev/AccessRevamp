import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { loadWorker6Config } from '../scripts/worker6/config.mjs';

const valid = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  WORKER6_GMAIL_ADDRESS: 'support@example.com',
};

test('Worker 6 requires service and Gmail app-password configuration', () => {
  assert.throws(() => loadWorker6Config({}), /SUPABASE_URL/);
  assert.throws(() => loadWorker6Config(valid), /WORKER6_GMAIL_APP_PASSWORD/);
});

test('configuration normalizes Gmail defaults and never exposes the password', () => {
  const config = loadWorker6Config({ ...valid, WORKER6_GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop' });
  assert.equal(config.imap.host, 'imap.gmail.com');
  assert.equal(config.imap.port, 993);
  assert.equal(config.imap.password, 'abcdefghijklmnop');
  assert.doesNotMatch(JSON.stringify(config.safe), /abcdefghijklmnop/);
});

test('the Gmail adapter is IMAP draft-only and has no send transport', async () => {
  const source = await readFile(new URL('../scripts/worker6/gmail-imap.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /sendMail|smtp|submitMessage|gmail\.users\.messages\.send/i);
  assert.match(source, /\\\\Draft/);
});
