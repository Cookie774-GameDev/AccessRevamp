import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { renderWorkspace } from '../src/services/customer-workspace-renderer.js';

test('review is the final visible step and owns the Stripe checkout action', async () => {
  const component = await readFile('src/components/order-wizard.js', 'utf8');
  assert.equal((component.match(/data-order-panel="/g) || []).length, 4);
  assert.doesNotMatch(component, /data-order-panel="4"/);
  assert.match(
    component,
    /data-order-panel="3"[\s\S]*data-order-checkout[\s\S]*data-checkout="complete_revamp"/,
  );
  assert.match(component, /data-checkout-status/);
  assert.match(component, /Secure payment powered by Stripe/);
  assert.doesNotMatch(component, /verified webhook|browser redirect/i);
});

test('the review summary uses compact project details and included-item regions', async () => {
  const service = await readFile('src/services/order-wizard.js', 'utf8');
  assert.match(service, /order-review__details/);
  assert.match(service, /order-review__included/);
  assert.match(service, /order-review__total/);
  assert.doesNotMatch(service, /Taxes \/ fees/);
});

test('optional order fields have a database migration matching the accepted form contract', async () => {
  const migration = await readFile(
    'supabase/migrations/20260725200338_relax_optional_order_draft_fields.sql',
    'utf8',
  );
  assert.match(migration, /char_length\(btrim\(main_goal\)\) between 2 and 4000/i);
  assert.match(migration, /char_length\(style_direction\) <= 4000/i);
  assert.match(migration, /char_length\(content_status\) <= 120/i);
  assert.doesNotMatch(migration, /btrim\(style_direction\)\) between 2/i);
  assert.doesNotMatch(migration, /char_length\(content_status\) between 2/i);
});

test('Settings is the only dashboard location that renders sign out and requires confirmation', async () => {
  const page = await readFile('src/pages/account-projects.js', 'utf8');
  assert.doesNotMatch(page, /data-account-profile|data-account-logout/);

  const html = renderWorkspace({
    profile: { full_name: 'Customer Name', email: 'customer@example.com' },
    projects: [],
  }, '', 'settings');
  assert.equal((html.match(/data-settings-signout/g) || []).length, 1);
  assert.match(html, /data-signout-confirm/);
  assert.match(html, /data-signout-cancel/);
  assert.match(html, /data-signout-approve/);
  assert.match(html, /Cancel/);
});

test('Complete Website Revamp title styling is shared by homepage and pricing cards', async () => {
  const css = await readFile('src/styles/components.css', 'utf8');
  assert.match(
    css,
    /\.plan-card\[data-plan-tier="complete_revamp"\]\s+h3[\s\S]*color:\s*#[a-f0-9]{6}/i,
  );
});
