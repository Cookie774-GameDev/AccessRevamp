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
  assert.match(component, /data-checkout-readiness/);
  assert.match(component, /data-checkout-ready="checking"/);
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

test('the review presents a premium project folio with timeline and working portfolio proof', async () => {
  const [service, styles] = await Promise.all([
    readFile('src/services/order-wizard.js', 'utf8'),
    readFile('src/styles/order-wizard-dark-contrast.css', 'utf8'),
  ]);
  assert.match(service, /order-review__folio/);
  assert.match(service, /order-review__deliverables/);
  assert.match(service, /order-review__timeline/);
  assert.match(service, /order-review__portfolio/);
  assert.match(service, /href="\/portfolio" target="_blank" rel="noopener noreferrer"/);
  assert.match(service, /Explore our working websites/);
  assert.match(service, /Payment secured/);
  assert.match(service, /Direction confirmed/);
  assert.match(service, /Delivered in your workspace/);
  assert.match(styles, /order-review__folio/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
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

test('paid plans present every included feature as a semantic bullet point', async () => {
  const [catalog, cards, wizard, service, groups, styles] = await Promise.all([
    readFile('src/config/tier-catalog.js', 'utf8'),
    readFile('src/components/cards.js', 'utf8'),
    readFile('src/components/order-wizard.js', 'utf8'),
    readFile('src/services/order-wizard.js', 'utf8'),
    readFile('src/components/plan-value-groups.js', 'utf8'),
    readFile('src/styles/components.css', 'utf8'),
  ]);

  for (const label of [
    'Clarity',
    'Presentation',
    'Launch support',
    'Protected value',
    'Strategy',
    'Website',
    'Campaign suite',
    'Quality proof',
    'Everything in Complete',
    'Cinematic direction',
    'Scroll production',
    'Inclusive delivery',
    'Private collaboration',
  ]) assert.match(catalog, new RegExp(label));

  assert.match(catalog, /valueGroups:\s*Object\.freeze/);
  assert.match(cards, /plan-value-groups/);
  assert.match(wizard, /order-plan__value-groups/);
  assert.match(service, /order-review__value-groups/);
  assert.match(groups, /<ul/);
  assert.match(groups, /<li/);
  assert.doesNotMatch(groups, /role="listitem"/);
  assert.match(styles, /\.plan-card \.plan-value-groups\s*\{[^}]*list-style:\s*disc/s);
});

test('checkout binds the order email to the confirmed signed-in account', async () => {
  const identity = await import('../src/services/checkout-identity.js').catch(() => ({}));
  assert.equal(typeof identity.bindConfirmedCheckoutEmail, 'function');
  const attributes = new Map();
  const emailControl = {
    value: 'different@example.com',
    readOnly: false,
    setAttribute(name, value) { attributes.set(name, value); },
  };
  const form = { elements: { email: emailControl } };

  assert.equal(
    identity.bindConfirmedCheckoutEmail(form, 'Confirmed@Example.com'),
    'confirmed@example.com',
  );
  assert.equal(emailControl.value, 'confirmed@example.com');
  assert.equal(emailControl.readOnly, true);
  assert.equal(attributes.get('aria-readonly'), 'true');

  const [checkout, wizard] = await Promise.all([
    readFile('src/services/checkout.js', 'utf8'),
    readFile('src/services/order-wizard.js', 'utf8'),
  ]);
  assert.match(checkout, /bindConfirmedCheckoutEmail\(form,\s*session\.user\.email\)/);
  assert.match(wizard, /bindConfirmedCheckoutEmail\(form,\s*session\?\.user\?\.email\)/);
});
