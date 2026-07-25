import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { orderDraftTextSchema } from '../netlify/functions/_shared/validation.mjs';

const validBrief = {
  requestId: '55b9d4ad-210a-4e74-919f-0d6f8f2844d2',
  planKey: 'complete_revamp',
  fullName: 'Customer Name',
  businessName: 'Customer Company',
  websiteUrl: 'https://example.com',
  email: 'customer@example.com',
  phone: '',
  businessNiche: 'Retail',
  mainGoal: 'Sell',
  requestedPages: 'Home',
  integrations: 'Shopify',
  styleDirection: '',
  contentStatus: '',
  launchDate: '',
  referenceUrls: '',
  specificRequest: '',
  cinematicSceneCount: '',
  cinematicDirection: '',
  portfolioConsent: false,
  termsAccepted: true,
};

test('only goal, pages, and integrations are required on the standard Brief step', () => {
  const parsed = orderDraftTextSchema.safeParse(validBrief);
  assert.equal(parsed.success, true);

  for (const name of ['mainGoal', 'requestedPages', 'integrations']) {
    const result = orderDraftTextSchema.safeParse({ ...validBrief, [name]: '' });
    assert.equal(result.success, false, `${name} must remain required`);
    assert.equal(result.error.issues[0].path[0], name);
  }
});

test('the Brief markup labels every optional field and requires the three project essentials', async () => {
  const html = await readFile('src/components/order-wizard.js', 'utf8');
  for (const name of ['mainGoal', 'requestedPages', 'integrations']) {
    assert.match(html, new RegExp(`name="${name}"[^>]*required`));
  }
  for (const name of ['styleDirection', 'contentStatus', 'launchDate']) {
    assert.doesNotMatch(html, new RegExp(`name="${name}"[^>]*required`));
  }
  assert.match(html, /Preferred style and colors <span>optional<\/span>/);
  assert.match(html, /Brand copy and content status <span>optional<\/span>/);
  assert.match(html, /Desired launch date <span>optional<\/span>/);
});

test('invalid Brief controls produce an exact field message instead of a generic blocker', async () => {
  const wizardService = await import('../src/services/order-wizard-validation.js').catch(() => ({}));
  assert.equal(typeof wizardService.validationStatusForControl, 'function');
  const control = {
    name: 'integrations',
    labels: [{ textContent: 'Required features and integrations' }],
  };
  assert.equal(
    wizardService.validationStatusForControl(control),
    'Complete “Required features and integrations” before continuing.',
  );
});
