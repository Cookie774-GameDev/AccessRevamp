import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const PROJECT_URL = 'https://vbkkimvedmklebghtkzs.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_WD8hNud9SZMDg6uK0N2cAA_4hnxz2ta';
const target = String(process.env.NETLIFY_AUTH_TARGET || process.env.DEPLOY_PREVIEW_URL || '').replace(/\/$/, '');
const requireServerAuth = process.env.REQUIRE_SERVER_AUTH === 'true';
assert.match(target, /^https:\/\/(?:deploy-preview-\d+--)?accessrevamp\.netlify\.app$/);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const deadline = Date.now() + 8 * 60 * 1000;
let html = '';
let bundleText = '';
let homepageStatus = 0;
let lastError = '';

while (Date.now() < deadline) {
  try {
    const response = await fetch(`${target}/signup?auth-smoke=${Date.now()}`, {
      headers: { 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(15_000),
    });
    homepageStatus = response.status;
    html = await response.text();
    if (!response.ok || !/<div[^>]+id=["']app["']/i.test(html)) {
      throw new Error(`Signup shell returned HTTP ${response.status}.`);
    }

    const scriptSources = [...html.matchAll(/<script[^>]+src=["']([^"']+\.js)["']/gi)]
      .map((match) => new URL(match[1], target).toString());
    if (!scriptSources.length) throw new Error('Signup page did not reference a JavaScript bundle.');

    const bundles = await Promise.all(scriptSources.map(async (source) => {
      const bundleResponse = await fetch(source, { signal: AbortSignal.timeout(30_000) });
      if (!bundleResponse.ok) throw new Error(`JavaScript bundle returned HTTP ${bundleResponse.status}.`);
      return bundleResponse.text();
    }));
    bundleText = bundles.join('\n');
    if (bundleText.includes(PROJECT_URL) && bundleText.includes(PUBLISHABLE_KEY)) break;
    throw new Error('The latest Supabase-connected browser bundle is not published yet.');
  } catch (error) {
    lastError = String(error?.message || error);
  }
  await sleep(10_000);
}

assert.equal(homepageStatus, 200, `Netlify signup page did not become ready: HTTP ${homepageStatus}. ${lastError}`);
assert.match(html, /<div[^>]+id=["']app["']/i);
assert.match(bundleText, new RegExp(PROJECT_URL.replaceAll('.', '\\.')));
assert.match(bundleText, new RegExp(PUBLISHABLE_KEY));

let customerApiConfigured = null;
let passwordCeremonyConfigured = null;
if (requireServerAuth) {
  const accountResponse = await fetch(`${target}/api/account-projects`, {
    headers: { origin: target },
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(accountResponse.status, 401, `Customer API expected HTTP 401 but returned ${accountResponse.status}.`);
  const accountBody = await accountResponse.json().catch(() => ({}));
  assert.match(String(accountBody.error || ''), /authentication required/i);
  customerApiConfigured = true;

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
  passwordCeremonyConfigured = true;
}

console.log(JSON.stringify({
  netlifyTarget: target,
  signupPageReady: true,
  publicSupabaseConfigBundled: true,
  serverAuthenticationRequired: requireServerAuth,
  customerApiConfigured,
  passwordCeremonyConfigured,
  credentialsPrinted: false,
}, null, 2));
