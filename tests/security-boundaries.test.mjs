import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('server-only payment and operational tables explicitly deny browser roles', async () => {
  const migration = await read('supabase/migrations/20260720170300_explicit_server_only_denies.sql');
  for (const table of [
    'order_drafts',
    'order_draft_assets',
    'payment_runtime_settings',
    'payment_security_incidents',
    'refund_authorizations',
    'stripe_events',
    'stripe_price_catalog',
    'upgrade_reservations',
  ]) assert.match(migration, new RegExp(`'${table}'`));
  assert.match(migration, /for all to anon, authenticated using \(false\) with check \(false\)/i);
});

test('payment results and private account routes are never search indexed', async () => {
  const metadata = await read('src/app/metadata.js');
  for (const route of [
    '/login',
    '/signup',
    '/account/projects',
    '/project-intake',
    '/dashboard',
    '/success',
    '/cancel',
    '/preview/:token',
  ]) assert.match(metadata, new RegExp(`'${route.replaceAll('/', '\\/')}'`));
  assert.match(metadata, /noindex,nofollow,noarchive/);
  assert.match(metadata, /Payment verification/);
  assert.doesNotMatch(metadata, /Payment received|checkout was completed/i);
  assert.doesNotMatch(metadata, /\/operator|Operator workspace/i);
});

test('provider-expired unpaid Checkout attempts reconcile without granting payment or pausing everyone', async () => {
  const migration = await read('supabase/migrations/20260727101500_reconcile_stale_unpaid_checkouts.sql');
  assert.match(migration, /status = 'checkout_created'/);
  assert.match(migration, /expires_at < timezone\('utc', now\(\)\) - interval '60 minutes'/);
  assert.match(migration, /not exists \([\s\S]*from public\.orders/);
  assert.match(migration, /set status = 'expired'/);
  assert.match(migration, /stale_checkout_reconciled/);
  assert.doesNotMatch(migration, /set checkout_enabled = false/);
});
