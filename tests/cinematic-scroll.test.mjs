import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [config, main, page, experience, styles, policy, validation, checkout, webhook, migration] = await Promise.all([
  readFile('src/config/tier-catalog.js', 'utf8'),
  readFile('src/main.js', 'utf8'),
  readFile('src/pages/cinematic.js', 'utf8'),
  readFile('src/cinematic-scroll.js', 'utf8'),
  readFile('src/cinematic-scroll.css', 'utf8'),
  readFile('src/data/policies.js', 'utf8'),
  readFile('netlify/functions/_shared/validation.mjs', 'utf8'),
  readFile('netlify/functions/_shared/stripe-catalog.mjs', 'utf8'),
  readFile('netlify/functions/stripe-webhook.mjs', 'utf8'),
  readFile('supabase/migrations/202607180001_add_cinematic_scroll_plan_and_refunds.sql', 'utf8'),
]);

test('the cinematic plan is exactly $250 one time and checkout-enabled', () => {
  assert.match(config, /cinematic_scroll[\s\S]*listPriceCents:\s*25000\b/);
  assert.match(config, /cinematic_scroll[\s\S]*cadence:\s*'one-time'/);
  assert.match(config, /deliveryBusinessDays:\s*3\b/);
  assert.match(validation, /cinematic_scroll/);
  assert.match(checkout, /none->cinematic_scroll[\s\S]*STRIPE_CINEMATIC_FULL_PRICE_ID/);
  assert.match(webhook, /checkout\.sessions\.retrieve/);
  assert.match(main, /setupCinematicExperience/);
  assert.match(main, /'\/cinematic-scroll'/);
  assert.match(experience, /removeEventListener/);
  assert.doesNotMatch(experience, /MutationObserver/);
});

test('evidence story is original, scroll-controlled, and accessible on mobile', () => {
  for (const beat of ['Scattered signals', 'Verified evidence', 'Redesigned hierarchy', 'Clear action']) assert.match(page, new RegExp(beat));
  assert.match(page, /data-cinematic-stage/);
  assert.match(experience, /prefers-reduced-motion/);
  assert.match(experience, /rect\.height[\s\S]*rect\.top/);
  assert.match(styles, /@media\s*\(max-width:\s*760px\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(styles, /100svh/);
});

test('refund policy allows cancellation before final digital delivery', () => {
  assert.match(policy, /full refund before final digital delivery/i);
  assert.match(policy, /final delivery occurs when/i);
  assert.match(policy, /three business days after payment and complete intake/i);
  assert.match(policy, /rights that cannot legally be excluded/i);
  assert.match(migration, /create table if not exists public\.refund_requests/);
  assert.match(migration, /refund_requests_insert_own_before_delivery/);
  assert.match(migration, /status = 'paid'/);
  assert.match(migration, /projects\.delivered_at is not null or projects\.status = 'completed'/);
});

test('legacy database catalog and project-linking functions preserve cinematic orders', () => {
  assert.match(migration, /plan_key in \('homepage_reveal', 'quick_fix', 'cinematic_scroll'\)/);
  assert.match(migration, /cinematic_scroll' and amount_total = 25000/);
  assert.match(migration, /when 'cinematic_scroll' then 'Cinematic Scroll Site project'/);
  assert.match(migration, /grant select, insert on table public\.refund_requests to authenticated/);
  assert.match(migration, /alter table public\.refund_requests enable row level security/);
});
