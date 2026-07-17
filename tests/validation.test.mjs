import test from 'node:test';
import assert from 'node:assert/strict';
import { contactSchema, outreachDraftSchema } from '../netlify/functions/_shared/validation.mjs';

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
