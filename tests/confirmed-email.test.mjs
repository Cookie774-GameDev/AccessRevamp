import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  'supabase/migrations/202607170003_require_confirmed_email.sql',
  'utf8',
);

test('order claiming requires a confirmed email', () => {
  assert.match(sql, /if new\.email_confirmed_at is not null then/);
  assert.match(sql, /users\.email_confirmed_at is not null/);
});

test('the auth trigger runs when confirmation state changes', () => {
  assert.match(sql, /update of email, email_confirmed_at, raw_user_meta_data/);
});

test('unconfirmed automatic email matches are removed', () => {
  assert.match(sql, /delete from public\.customer_projects/);
  assert.match(sql, /set user_id = null/);
  assert.match(sql, /users\.email_confirmed_at is null/);
});
