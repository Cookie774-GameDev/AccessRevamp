import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('supabase/migrations/202607170001_accessrevamp.sql', 'utf8');

test('customer record claiming requires a confirmed matching email', () => {
  assert.match(sql, /and lower\(email\) = v_email/);
  assert.match(sql, /and email_confirmed_at is not null/);
  assert.match(sql, /confirmed user\/email mismatch/);
});

test('the isolated auth trigger runs when confirmation state changes', () => {
  assert.match(sql, /drop trigger if exists ar_claim_customer_after_auth_change on auth\.users/);
  assert.match(sql, /after insert or update of email, email_confirmed_at on auth\.users/);
  assert.match(sql, /when \(new\.email_confirmed_at is not null and new\.email is not null\)/);
});

test('only AccessRevamp records are claimed', () => {
  assert.match(sql, /update public\.ar_orders/);
  assert.match(sql, /insert into public\.ar_projects/);
  assert.doesNotMatch(sql, /update public\.orders\b/);
  assert.doesNotMatch(sql, /insert into public\.customer_projects\b/);
});
