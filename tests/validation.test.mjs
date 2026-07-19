import test from 'node:test';
import assert from 'node:assert/strict';
import { contactSchema, entitlementQuoteSchema, outreachDraftSchema, projectIntakeTextSchema } from '../netlify/functions/_shared/validation.mjs';

test('contact validation accepts a bounded legitimate request', () => {
  const result = contactSchema.parse({
    firstName: 'Avery',
    lastName: 'Stone',
    email: 'OWNER@EXAMPLE.COM',
    websiteUrl: 'https://example.com',
    message: 'I would like a clearer homepage hierarchy for my public storefront.',
    companyFax: '',
    consent: true,
  });
  assert.equal(result.email, 'owner@example.com');
});

test('contact validation rejects localhost and honeypot submissions', () => {
  assert.throws(() => contactSchema.parse({ firstName: 'A', lastName: '', email: 'a@example.com', websiteUrl: 'http://localhost:3000', message: 'This message is long enough for validation.', companyFax: 'bot', consent: true }));
});

test('outreach draft requires public contact provenance and substantive copy', () => {
  assert.throws(() => outreachDraftSchema.parse({ businessName: 'Shop', websiteUrl: 'https://shop.example', recipientEmail: 'owner@example.com', contactSourceUrl: 'not-a-url', subject: 'Hello there', bodyText: 'Too short' }));
});

test('entitlement quote accepts only one paid target tier and never identity input', () => {
  assert.deepEqual(entitlementQuoteSchema.parse({ targetTier: 'complete_revamp' }), { targetTier: 'complete_revamp' });
  assert.throws(() => entitlementQuoteSchema.parse({ targetTier: 'free_snapshot' }));
  assert.throws(() => entitlementQuoteSchema.parse({ targetTier: 'complete_revamp', email: 'owner@example.com' }));
});

test('project intake accepts one to five pages and public design references', () => {
  const base = {
    projectId: 'b5fbc325-2b18-44ae-9554-0a8c5b62b245',
    plan: 'complete_revamp',
    pages: ['home', 'services'],
    styleNotes: 'Editorial, warm, image-led, and easy to use on a phone.',
    contentNotes: '',
    cinematicNotes: '',
    projectNotes: '',
    referenceUrls: ['https://example.com/inspiration'],
    inspirationChoices: ['https://www.aesop.com/'],
    rightsConfirmed: true,
  };
  assert.equal(projectIntakeTextSchema.parse(base).pages.length, 2);
  assert.throws(() => projectIntakeTextSchema.parse({ ...base, pages: ['home', 'about', 'services', 'shop', 'portfolio', 'faq'] }));
  assert.throws(() => projectIntakeTextSchema.parse({ ...base, referenceUrls: ['http://localhost:3000/private'] }));
});
