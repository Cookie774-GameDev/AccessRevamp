import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SUPPORT_EMAIL = 'support.accessrevamp.com@gmail.com';

const [legalPage, routes, metadata, shell, styles] = await Promise.all([
  readFile('src/pages/legal.js', 'utf8'),
  readFile('src/main.js', 'utf8'),
  readFile('src/app/metadata.js', 'utf8'),
  readFile('src/components/shell.js', 'utf8'),
  readFile('src/styles/legal-support.css', 'utf8'),
]);

test('privacy policy contains substantive collection use sharing retention security and rights terms', () => {
  assert.match(legalPage, /Privacy Policy explains what AccessRevamp collects/i);
  assert.match(legalPage, /Information we collect/);
  assert.match(legalPage, /How information is used/);
  assert.match(legalPage, /When information may be shared/);
  assert.match(legalPage, /Retention/);
  assert.match(legalPage, /Your privacy rights/);
  assert.match(legalPage, /International processing/);
  assert.match(legalPage, /Children/);
  assert.match(legalPage, /does not sell personal information/i);
  assert.doesNotMatch(legalPage, /Supabase handles|backend is Supabase|powered by Supabase/i);
});

test('customer policy terms refund accessibility and support are complete public routes', () => {
  for (const route of ['/policy', '/privacy', '/terms', '/refunds', '/accessibility', '/legal', '/support', '/customer-support']) {
    assert.match(routes, new RegExp(`['"]${route.replace('/', '\/')}['"]`));
    assert.match(metadata, new RegExp(`['"]${route.replace('/', '\/')}['"]`));
  }
  assert.match(legalPage, /Customer service policy/);
  assert.match(legalPage, /Terms of service/);
  assert.match(legalPage, /Limitation of liability/);
  assert.match(legalPage, /Purchase does not automatically grant portfolio rights/);
  assert.match(legalPage, /Customer support/);
  assert.match(legalPage, /Project dashboard and delivery/);
  assert.match(legalPage, /Security and abuse reports/);
});

test('support email is valid visible and linked across policy pages and footer', () => {
  assert.match(SUPPORT_EMAIL, /^[^\s@]+@gmail\.com$/i);
  assert.ok(legalPage.includes(SUPPORT_EMAIL));
  assert.ok(shell.includes(SUPPORT_EMAIL));
  assert.match(legalPage, /mailto:\$\{SUPPORT_EMAIL\}/);
  assert.match(shell, /mailto:\$\{SUPPORT_EMAIL\}/);
  assert.match(legalPage, /Never send passwords|never send passwords/i);
  assert.match(legalPage, /full card numbers/i);
});

test('policy pages have polished desktop mobile reduced-motion and print layouts', () => {
  assert.match(styles, /\.policy-hero__grid/);
  assert.match(styles, /\.policy-layout/);
  assert.match(styles, /\.policy-contact__card/);
  assert.match(styles, /@media \(max-width: 1000px\)/);
  assert.match(styles, /@media \(max-width: 680px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@media print/);
  assert.match(styles, /overflow-wrap: anywhere/);
});

test('legal and support source remains deterministic under repeated parallel reads', async () => {
  const samples = await Promise.all(Array.from({ length: 100 }, async () => {
    const [page, css] = await Promise.all([
      readFile('src/pages/legal.js', 'utf8'),
      readFile('src/styles/legal-support.css', 'utf8'),
    ]);
    return {
      emailCount: page.split(SUPPORT_EMAIL).length - 1,
      privacy: page.includes('Your privacy rights'),
      support: page.includes('Project dashboard and delivery'),
      mobile: css.includes('@media (max-width: 680px)'),
    };
  }));

  assert.ok(samples.every((sample) => sample.emailCount >= 6));
  assert.ok(samples.every((sample) => sample.privacy && sample.support && sample.mobile));
});
