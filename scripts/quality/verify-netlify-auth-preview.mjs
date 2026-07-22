import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const PROJECT_URL = 'https://vbkkimvedmklebghtkzs.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_WD8hNud9SZMDg6uK0N2cAA_4hnxz2ta';
const target = String(process.env.DEPLOY_PREVIEW_URL || '').replace(/\/$/, '');
assert.match(target, /^https:\/\/deploy-preview-\d+--accessrevamp\.netlify\.app$/);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const deadline = Date.now() + 8 * 60 * 1000;
let html = '';
let homepageStatus = 0;

while (Date.now() < deadline) {
  try {
    const response = await fetch(`${target}/signup`, {
      headers: { 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(15_000),
    });
    homepageStatus = response.status;
    html = await response.text();
    if (response.ok && /<div[^>]+id=["']app["']/i.test(html)) break;
  } catch {
    // Netlify may still be publishing the immutable deploy. Retry until deadline.
  }
  await sleep(10_000);
}

assert.equal(homepageStatus, 200, `Netlify signup page did not become ready: HTTP ${homepageStatus}.`);
assert.match(html, /<div[^>]+id=["']app["']/i);

const scriptSources = [...html.matchAll(/<script[^>]+src=["']([^"']+\.js)["']/gi)]
  .map((match) => new URL(match[1], target).toString());
assert.ok(scriptSources.length > 0, 'Netlify signup page did not reference a JavaScript bundle.');
const bundles = await Promise.all(scriptSources.map(async (source) => {
  const response = await fetch(source, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.ok, true, `JavaScript bundle returned HTTP ${response.status}.`);
  return response.text();
}));
const bundleText = bundles.join('\n');
assert.match(bundleText, new RegExp(PROJECT_URL.replaceAll('.', '\\.')));
assert.match(bundleText, new RegExp(PUBLISHABLE_KEY));

const accountResponse = await fetch(`${target}/api/account-projects`, {
  headers: { origin: target },
  signal: AbortSignal.timeout(30_000),
});
assert.equal(accountResponse.status, 401, `Customer API expected HTTP 401 but returned ${accountResponse.status}.`);
const accountBody = await accountResponse.json().catch(() => ({}));
assert.match(String(accountBody.error || ''), /authentication required/i);

const loginResponse = await fetch(`${target}/api/auth-login-start`, {
  method: 'POST',
  headers: {
    origin: target,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    email: `netlify-auth-smoke-${randomUUID()}@example.invalid`,
    password: 'DeliberatelyInvalid!234',
  }),
  signal: AbortSignal.timeout(30_000),
});
assert.ok(
  [401, 429].includes(loginResponse.status),
  `Password ceremony expected HTTP 401 or 429 but returned ${loginResponse.status}.`,
);
const loginBody = await loginResponse.json().catch(() => ({}));
assert.doesNotMatch(JSON.stringify(loginBody), /service_role|secret|publishable|supabase server configuration/i);

console.log(JSON.stringify({
  deployPreview: target,
  signupPageReady: true,
  publicSupabaseConfigBundled: true,
  customerApiConfigured: true,
  passwordCeremonyConfigured: true,
  credentialsPrinted: false,
}, null, 2));
