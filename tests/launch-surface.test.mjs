import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

async function collectTextFiles(path) {
  const content = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) content.push(...await collectTextFiles(target));
    else if (/\.(?:js|css|html)$/.test(entry.name)) content.push(await readFile(target, 'utf8'));
  }
  return content;
}

const [config, checkoutClient, checkoutFunction, paymentRuntime, customerCopy] = await Promise.all([
  readFile('src/config.js', 'utf8'),
  readFile('src/services/checkout.js', 'utf8'),
  readFile('netlify/functions/create-checkout.mjs', 'utf8'),
  readFile('netlify/functions/_shared/payment-runtime.mjs', 'utf8'),
  Promise.all([
    collectTextFiles('src/pages'),
    collectTextFiles('src/components'),
    collectTextFiles('src/data'),
  ]).then((groups) => groups.flat().join('\n')),
]);

test('customer-visible source has no sandbox checkout or backend-provider branding', () => {
  assert.doesNotMatch(customerCopy, /sandbox checkout|stripe test mode|secure test checkout|test-mode notice/i);
  assert.doesNotMatch(customerCopy, /\bSupabase\b/i);
});

test('browser payment access is disabled by default and saves the request without opening Checkout', () => {
  assert.match(config, /VITE_LIVE_CHECKOUT_ENABLED === 'true'/);
  assert.doesNotMatch(config, /VITE_PAYMENT_MODE|checkoutIsSandbox/);
  assert.match(checkoutClient, /if \(!siteConfig\.liveCheckoutEnabled\)/);
  assert.ok(
    checkoutClient.indexOf("fetch(ORDER_DRAFT_ENDPOINT")
      < checkoutClient.indexOf('if (!siteConfig.liveCheckoutEnabled)'),
  );
  assert.ok(
    checkoutClient.indexOf('if (!siteConfig.liveCheckoutEnabled)')
      < checkoutClient.indexOf('fetch(CHECKOUT_ENDPOINT'),
  );
  assert.match(checkoutClient, /No payment was started/);
});

test('public Checkout creation requires a separately approved live runtime', () => {
  assert.match(paymentRuntime, /export async function requireLiveCheckoutRuntime/);
  assert.match(paymentRuntime, /!runtime\.expectedLivemode \|\| !runtime\.livePaymentApproved/);
  assert.match(checkoutFunction, /requireRuntime = requireLiveCheckoutRuntime/);
  assert.match(checkoutFunction, /await requireRuntime\(admin, process\.env\)/);
});
