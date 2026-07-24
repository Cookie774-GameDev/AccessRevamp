import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const PROJECT_URL = 'https://vbkkimvedmklebghtkzs.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_WD8hNud9SZMDg6uK0N2cAA_4hnxz2ta';
const target = String(process.env.NETLIFY_AUTH_TARGET || process.env.DEPLOY_PREVIEW_URL || '').replace(/\/$/, '');
const requireServerAuth = process.env.REQUIRE_SERVER_AUTH === 'true';
assert.match(
  target,
  /^https:\/\/(?:(?:deploy-preview-\d+--)?accessrevamp\.netlify\.app|(?:www\.)?accessrevamp\.com)$/,
);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithRetry(url, options = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status < 500 || attempt === attempts) return response;
      lastError = new Error(`${url} returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await sleep(attempt * 1_500);
  }
  throw lastError || new Error(`${url} could not be reached.`);
}

const deadline = Date.now() + 8 * 60 * 1000;
let html = '';
let bundleText = '';
let homepageStatus = 0;
let recoveryStatus = 0;
let lastError = '';

while (Date.now() < deadline) {
  try {
    const response = await fetchWithRetry(`${target}/signup?auth-smoke=${Date.now()}`, {
      headers: { 'cache-control': 'no-cache' },
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
      const bundleResponse = await fetchWithRetry(source);
      if (!bundleResponse.ok) throw new Error(`JavaScript bundle returned HTTP ${bundleResponse.status}.`);
      return bundleResponse.text();
    }));
    bundleText = bundles.join('\n');
    const requiredMarkers = [
      PROJECT_URL,
      PUBLISHABLE_KEY,
      '/forgot-password',
      '/recover-account',
      'accessrevamp.auth.recovery.v1',
      'resetPasswordForEmail',
      'Access Revamp Authorization',
    ];
    const missing = requiredMarkers.filter((marker) => !bundleText.includes(marker));
    if (missing.length) throw new Error(`The latest account bundle is missing: ${missing.join(', ')}`);

    const recoveryResponse = await fetchWithRetry(`${target}/forgot-password?auth-smoke=${Date.now()}`, {
      headers: { 'cache-control': 'no-cache' },
    });
    recoveryStatus = recoveryResponse.status;
    const recoveryHtml = await recoveryResponse.text();
    if (!recoveryResponse.ok || !/<div[^>]+id=["']app["']/i.test(recoveryHtml)) {
      throw new Error(`Recovery shell returned HTTP ${recoveryResponse.status}.`);
    }
    break;
  } catch (error) {
    lastError = String(error?.message || error);
  }
  await sleep(10_000);
}

assert.equal(homepageStatus, 200, `Signup page did not become ready: HTTP ${homepageStatus}. ${lastError}`);
assert.equal(recoveryStatus, 200, `Recovery page did not become ready: HTTP ${recoveryStatus}. ${lastError}`);
assert.match(html, /<div[^>]+id=["']app["']/i);
assert.match(bundleText, new RegExp(PROJECT_URL.replaceAll('.', '\\.')));
assert.match(bundleText, new RegExp(PUBLISHABLE_KEY));
assert.match(bundleText, /accessrevamp\.auth\.recovery\.v1/);
assert.match(bundleText, /resetPasswordForEmail/);
assert.doesNotMatch(bundleText, /Sandbox checkout|Test-mode notice|Stripe test mode is active/i);

let customerApiConfigured = null;
let passwordCeremonyConfigured = null;
let signupEmailStateConfigured = null;
if (requireServerAuth) {
  const accountResponse = await fetchWithRetry(`${target}/api/account-projects`, {
    headers: { origin: target },
  });
  assert.equal(accountResponse.status, 401, `Customer API expected HTTP 401 but returned ${accountResponse.status}.`);
  const accountBody = await accountResponse.json().catch(() => ({}));
  assert.match(String(accountBody.error || ''), /authentication required/i);
  customerApiConfigured = true;

  const loginResponse = await fetchWithRetry(`${target}/api/auth-login-start`, {
    method: 'POST',
    headers: {
      origin: target,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: `netlify-auth-smoke-${randomUUID()}@example.invalid`,
      password: 'DeliberatelyInvalid!234',
    }),
  });
  assert.ok(
    [401, 429].includes(loginResponse.status),
    `Password ceremony expected HTTP 401 or 429 but returned ${loginResponse.status}.`,
  );
  const loginBody = await loginResponse.json().catch(() => ({}));
  assert.doesNotMatch(JSON.stringify(loginBody), /service_role|secret|publishable|server configuration/i);
  passwordCeremonyConfigured = true;

  const resendResponse = await fetchWithRetry(`${target}/api/auth-signup-resend`, {
    method: 'POST',
    headers: {
      origin: target,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email: `netlify-signup-smoke-${randomUUID()}@example.invalid` }),
  });
  assert.ok(
    [202, 409, 429].includes(resendResponse.status),
    `Signup email ceremony expected HTTP 202, 409, or 429 but returned ${resendResponse.status}.`,
  );
  const resendBody = await resendResponse.json().catch(() => ({}));
  if (resendResponse.status === 409) assert.equal(resendBody.code, 'RESTART_SIGNUP');
  if (resendResponse.status === 202) assert.equal(resendBody.ok, true);
  assert.doesNotMatch(JSON.stringify(resendBody), /service_role|secret|publishable|server configuration/i);
  signupEmailStateConfigured = true;
}

console.log(JSON.stringify({
  authenticationTarget: target,
  signupPageReady: true,
  recoveryPageReady: true,
  recoveryBundleReady: true,
  publicAccountConfigBundled: true,
  customerFacingSandboxLabelsAbsent: true,
  serverAuthenticationRequired: requireServerAuth,
  customerApiConfigured,
  passwordCeremonyConfigured,
  signupEmailStateConfigured,
  credentialsPrinted: false,
}, null, 2));
