const target = new URL(process.env.PRODUCTION_SMOKE_TARGET || 'https://accessrevamp.com');
const timeoutMs = Number(process.env.PRODUCTION_SMOKE_TIMEOUT_MS || 15_000);

async function request(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(new URL(path, target), {
      redirect: 'manual',
      cache: 'no-store',
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function requireHeader(response, name, pattern) {
  const value = response.headers.get(name) || '';
  if (!pattern.test(value)) throw new Error(`${name} failed production verification.`);
}

const pricing = await request('/pricing');
if (pricing.status !== 200) throw new Error(`Pricing returned ${pricing.status}.`);
const pricingHtml = await pricing.text();
if (!/<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/accessrevamp\.com\/pricing["']/i.test(pricingHtml)) {
  throw new Error('Pricing canonical URL failed production verification.');
}

const missing = await request(`/audit-smoke-missing-${Date.now()}`);
if (missing.status !== 404) throw new Error(`Unknown route returned ${missing.status}.`);

const login = await request('/login');
if (login.status !== 200) throw new Error(`Login returned ${login.status}.`);
requireHeader(login, 'cache-control', /no-store/i);
requireHeader(login, 'referrer-policy', /^no-referrer$/i);

const checkout = await request('/api/create-checkout', {
  method: 'POST',
  headers: {
    origin: target.origin,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    targetTier: 'homepage_reveal',
    requestId: '11111111-1111-4111-8111-111111111111',
  }),
});
if (![401, 403].includes(checkout.status)) {
  throw new Error(`Unauthenticated checkout returned ${checkout.status}.`);
}

const health = await request('/api/payment-health');
if (![200, 503].includes(health.status)) throw new Error(`Payment health returned ${health.status}.`);
const healthPayload = await health.json().catch(() => null);
if (!healthPayload || typeof healthPayload.ready !== 'boolean') {
  throw new Error('Payment health did not return its readiness contract.');
}

console.log(JSON.stringify({
  target: target.origin,
  pricing: pricing.status,
  missing: missing.status,
  login: login.status,
  checkout: checkout.status,
  paymentHealth: health.status,
  ready: healthPayload.ready,
}));
