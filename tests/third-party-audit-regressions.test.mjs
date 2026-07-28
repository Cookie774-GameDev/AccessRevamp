import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

test('webhook liveness uses durable webhook freshness without globally pausing abandoned checkout sessions', async () => {
  const sql = await read(
    'supabase/migrations/20260728181724_harden_audited_payment_and_homepage_workflows.sql',
  );

  assert.match(sql, /last_successful_webhook_at/i);
  assert.match(sql, /last_checkout_created_at/i);
  assert.match(sql, /webhook_liveness_unconfirmed/i);
  assert.match(sql, /reconcile_accessrevamp_stale_unpaid_checkouts\(\)/i);
  assert.doesNotMatch(
    sql,
    /maintenance_reason\s*=\s*'[^']*webhook[^']*'[\s\S]*checkout_enabled\s*=\s*false/i,
  );
});

test('Homepage Reveal reconciliation is deferred, accepts pre-activation feedback, and ignores rejected feedback', async () => {
  const sql = await read(
    'supabase/migrations/20260728181724_harden_audited_payment_and_homepage_workflows.sql',
  );

  assert.match(
    sql,
    /create constraint trigger reconcile_accessrevamp_homepage_selection_task_trigger/i,
  );
  assert.match(sql, /deferrable initially deferred/i);
  assert.match(sql, /feedback\.status <> 'rejected'/i);
  assert.match(
    sql,
    /selection_task\.status in \('succeeded',\s*'skipped',\s*'canceled'\)/i,
  );
  assert.doesNotMatch(sql, /selection_task\.status <> 'waiting_customer'/i);
});

test('public discovery uses the production domain and supplies canonical route metadata', async () => {
  const [sitemap, metadata, routePage] = await Promise.all([
    read('public/sitemap.xml'),
    read('src/app/metadata.js'),
    read('app/[[...slug]]/page.tsx'),
  ]);

  assert.match(sitemap, /https:\/\/accessrevamp\.com\//);
  assert.doesNotMatch(sitemap, /netlify\.app/i);
  assert.match(metadata, /rel="canonical"|link\[rel="canonical"\]/i);
  assert.match(metadata, /https:\/\/accessrevamp\.com/i);
  assert.match(routePage, /notFound\(\)/);
  assert.match(routePage, /generateMetadata/);
  assert.match(routePage, /alternates:\s*\{\s*canonical:/);
});

test('the webhook supplies the production tax-aware fulfillment contract', async () => {
  const webhook = await read('netlify/functions/stripe-webhook.mjs');

  assert.match(webhook, /tax_cents:\s*taxCents/i);
  assert.match(webhook, /amount_total_cents:\s*amountTotalCents/i);
  assert.match(webhook, /tax_collection_mode:\s*taxCollectionMode/i);
  assert.match(webhook, /session\.total_details\?\.amount_tax/i);
  assert.match(webhook, /session\.automatic_tax\?\.enabled/i);
});
