import test from 'node:test';
import assert from 'node:assert/strict';

import { createEntitlementQuoteHandler } from '../netlify/functions/entitlement-quote.mjs';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORIGIN = 'https://accessrevamp.test';

function createAdmin({ entitlement = null, queryError = null } = {}) {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: USER_ID,
            email: 'owner@example.com',
            email_confirmed_at: '2026-07-18T00:00:00.000Z',
          },
        },
        error: null,
      }),
    },
    from(table) {
      assert.equal(table, 'entitlements');
      const filters = [];
      return {
        select(columns) {
          assert.equal(columns, 'highest_tier_key,effective_paid_cents,status');
          return this;
        },
        eq(column, value) {
          filters.push([column, value]);
          return this;
        },
        async maybeSingle() {
          assert.deepEqual(filters, [['user_id', USER_ID], ['status', 'active']]);
          return { data: entitlement, error: queryError };
        },
      };
    },
  };
}

function quoteRequest(body, overrides = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request(`${ORIGIN}/.netlify/functions/entitlement-quote`, {
    method: overrides.method || 'POST',
    headers: {
      origin: overrides.origin || ORIGIN,
      authorization: overrides.authorization || 'Bearer verified.token',
      'content-type': overrides.contentType || 'application/json',
      ...(overrides.includeLength === false ? {} : { 'content-length': String(Buffer.byteLength(text)) }),
    },
    body: ['GET', 'HEAD'].includes(overrides.method) ? undefined : text,
  });
}

async function responseJson(handler, request) {
  const response = await handler(request);
  return { response, body: await response.json() };
}

test('quote endpoint returns only the exact safe first-purchase shape', async () => {
  const previousOrigins = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = ORIGIN;
  try {
    const handler = createEntitlementQuoteHandler({ getAdmin: () => createAdmin() });
    const { response, body } = await responseJson(handler, quoteRequest({ targetTier: 'homepage_reveal' }));

    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(body).sort(), ['creditCents', 'dueNowCents', 'listPriceCents', 'resultingTier', 'targetTier']);
    assert.deepEqual(body, {
      targetTier: 'homepage_reveal',
      listPriceCents: 5000,
      creditCents: 0,
      dueNowCents: 5000,
      resultingTier: 'homepage_reveal',
    });
    assert.doesNotMatch(JSON.stringify(body), /email|token|reservation|stripe|price_/i);
  } finally {
    if (previousOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previousOrigins;
  }
});

test('quote endpoint derives all cumulative credits from the active server entitlement', async () => {
  const previousOrigins = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = ORIGIN;
  try {
    const cases = [
      ['homepage_reveal', 5000, 'complete_revamp', 15000],
      ['homepage_reveal', 5000, 'cinematic_scroll', 20000],
      ['complete_revamp', 20000, 'cinematic_scroll', 5000],
    ];
    for (const [highestTier, effectivePaidCents, targetTier, dueNowCents] of cases) {
      const admin = createAdmin({ entitlement: {
        highest_tier_key: highestTier,
        effective_paid_cents: effectivePaidCents,
        status: 'active',
      } });
      const handler = createEntitlementQuoteHandler({ getAdmin: () => admin });
      const { response, body } = await responseJson(handler, quoteRequest({ targetTier }));
      assert.equal(response.status, 200);
      assert.equal(body.creditCents, effectivePaidCents);
      assert.equal(body.dueNowCents, dueNowCents);
      assert.equal(body.resultingTier, targetTier);
    }
  } finally {
    if (previousOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previousOrigins;
  }
});

test('quote endpoint maps authentication, transition, schema, origin, size, and configuration failures', async () => {
  const previousOrigins = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = ORIGIN;
  try {
    const entitlement = { highest_tier_key: 'homepage_reveal', effective_paid_cents: 5000, status: 'active' };
    const handler = createEntitlementQuoteHandler({ getAdmin: () => createAdmin({ entitlement }) });

    assert.equal((await handler(quoteRequest({ targetTier: 'homepage_reveal' }))).status, 409);
    assert.equal((await handler(quoteRequest({ targetTier: 'free_snapshot' }))).status, 422);
    assert.equal((await handler(quoteRequest({ targetTier: 'complete_revamp', email: 'owner@example.com' }))).status, 422);
    assert.equal((await handler(quoteRequest({ targetTier: 'complete_revamp' }, { authorization: 'Basic invalid' }))).status, 401);
    assert.equal((await handler(quoteRequest({ targetTier: 'complete_revamp' }, { origin: 'https://attacker.example' }))).status, 403);
    assert.equal((await handler(quoteRequest({ targetTier: 'complete_revamp' }, { method: 'GET' }))).status, 405);
    assert.equal((await handler(quoteRequest({ targetTier: 'complete_revamp' }, { contentType: 'text/plain' }))).status, 415);
    assert.equal((await handler(quoteRequest(`{"targetTier":"complete_revamp","padding":"${'x'.repeat(17000)}"}`, { includeLength: false }))).status, 413);

    const unavailable = createEntitlementQuoteHandler({ getAdmin: () => { throw new Error('service key detail'); } });
    const result = await responseJson(unavailable, quoteRequest({ targetTier: 'complete_revamp' }));
    assert.equal(result.response.status, 503);
    assert.deepEqual(result.body, { error: 'The request could not be completed.' });
    assert.doesNotMatch(JSON.stringify(result.body), /service key|secret|token/i);
  } finally {
    if (previousOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previousOrigins;
  }
});

test('quote endpoint fails closed on database errors and inconsistent entitlement value', async () => {
  const previousOrigins = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = ORIGIN;
  try {
    const dbFailure = createEntitlementQuoteHandler({ getAdmin: () => createAdmin({ queryError: new Error('database detail') }) });
    assert.equal((await dbFailure(quoteRequest({ targetTier: 'complete_revamp' }))).status, 503);

    const inconsistent = createEntitlementQuoteHandler({ getAdmin: () => createAdmin({
      entitlement: { highest_tier_key: 'homepage_reveal', effective_paid_cents: 7000, status: 'active' },
    }) });
    assert.equal((await inconsistent(quoteRequest({ targetTier: 'complete_revamp' }))).status, 503);
  } finally {
    if (previousOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = previousOrigins;
  }
});
