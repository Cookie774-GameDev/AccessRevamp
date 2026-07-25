import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { loadWorker6Config } from '../scripts/worker6/config.mjs';

const valid = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  WORKER6_GMAIL_ADDRESS: 'combatonline02@gmail.com',
  WORKER6_SUPPORT_SMTP_USERNAME: 'support@accessrevamp.shop',
  WORKER6_SUPPORT_SMTP_PASSWORD: 'qrst uvwx yz12 3456',
  WORKER6_SUPPORT_FROM_ADDRESS: 'support@accessrevamp.shop',
};

test('Worker 6 requires separate reader and support-sender credentials', () => {
  assert.throws(() => loadWorker6Config({}), /SUPABASE_URL/);
  assert.throws(() => loadWorker6Config(valid), /WORKER6_GMAIL_APP_PASSWORD/);
  assert.throws(
    () => loadWorker6Config({ ...valid, WORKER6_GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop', WORKER6_SUPPORT_FROM_ADDRESS: 'other@example.com' }),
    /support sender identity/i,
  );
});

test('configuration normalizes Gmail defaults and never exposes the password', () => {
  const config = loadWorker6Config({ ...valid, WORKER6_GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop' });
  assert.equal(config.imap.host, 'imap.gmail.com');
  assert.equal(config.imap.port, 993);
  assert.equal(config.imap.password, 'abcdefghijklmnop');
  assert.equal(config.readerAddress, 'combatonline02@gmail.com');
  assert.equal(config.support.fromAddress, 'support@accessrevamp.shop');
  assert.equal(config.support.username, 'support@accessrevamp.shop');
  assert.equal(config.autoSendEnabled, false);
  assert.doesNotMatch(JSON.stringify(config.safe), /abcdefghijklmnop/);
  assert.doesNotMatch(JSON.stringify(config.safe), /qrstuvwx/);
});

test('the Gmail adapter remains reader and draft storage only', async () => {
  const source = await readFile(new URL('../scripts/worker6/gmail-imap.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /sendMail|smtp|submitMessage|gmail\.users\.messages\.send/i);
  assert.match(source, /\\\\Draft/);
});
