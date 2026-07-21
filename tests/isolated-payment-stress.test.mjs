import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import {
  REQUIRED_CHECKOUT_METADATA_KEYS,
  buildCheckoutMetadata,
  normalizeReservation,
} from '../netlify/functions/_shared/checkout-contract.mjs';
import { createCheckoutHandler } from '../netlify/functions/create-checkout.mjs';
import { createRefundExecutionHandler } from '../netlify/functions/refund-execute.mjs';
import { createWebhookHandler } from '../netlify/functions/stripe-webhook.mjs';
import {
  TIERS,
  getEligibleCreditCents,
  quoteUpgrade,
} from '../src/config/tier-catalog.js';

const ORIGIN = 'https://isolated.accessrevamp.test';
const USER_ID = '10000000-0000-4000-8000-000000000001';
const USER_EMAIL = 'isolated@example.test';
const REQUEST_ID = '20000000-0000-4000-8000-000000000002';
const RESERVATION_ID = '30000000-0000-4000-8000-000000000003';
const DRAFT_ID = '40000000-0000-4000-8000-000000000004';
const AUTHORIZATION_ID = '50000000-0000-4000-8000-000000000005';
const ORDER_ID = '60000000-0000-4000-8000-000000000006';
const OPERATOR_ID = '70000000-0000-4000-8000-000000000007';
const PRICE_ID = 'price_isolated_complete_revamp';
const SESSION_ID = 'cs_test_isolated_stress';
const CHECKOUT_URL = `https://checkout.stripe.com/c/pay/${SESSION_ID}`;

function fixedUuid(index) {
  return `90000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

async function withEnvironment(values, callback) {
  const previous = new Map();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, Object.hasOwn(process.env, key) ? process.env[key] : undefined);
    if (value === undefined) delete process.env[key];
    else process.env[key] = String(value);
  }
  try {
    return await callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withoutServerNoise(callback) {
  const original = console.error;
  console.error = () => {};
  try {
    return await callback();
  } finally {
    console.error = original;
  }
}

function request(path, {
  method = 'POST',
  body,
  token = 'isolated-token',
  origin = ORIGIN,
  headers = {},
} = {}) {
  const finalHeaders = new Headers(headers);
  if (origin !== null) finalHeaders.set('origin', origin);
  if (token !== null) finalHeaders.set('authorization', `Bearer ${token}`);
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders.set('content-type', 'application/json');
  }
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
  });
}

function matches(row, filters) {
  return filters.every(({ kind, key, value }) => {
    if (kind === 'eq') return row?.[key] === value;
    if (kind === 'in') return value.includes(row?.[key]);
    return false;
  });
}

function queryBuilder(execute) {
  const filters = [];
  let operation = 'select';
  let values;
  let options;
  let selection;
  const builder = {
    select(columns) {
      selection = columns;
      return builder;
    },
    update(next) {
      operation = 'update';
      values = next;
      return builder;
    },
    upsert(next, nextOptions) {
      operation = 'upsert';
      values = next;
      options = nextOptions;
      return builder;
    },
    eq(key, value) {
      filters.push({ kind: 'eq', key, value });
      return builder;
    },
    in(key, value) {
      filters.push({ kind: 'in', key, value });
      return builder;
    },
    maybeSingle() {
      return Promise.resolve(execute({ operation, values, options, filters, selection, single: true }));
    },
    then(resolve, reject) {
      return Promise.resolve(execute({ operation, values, options, filters, selection, single: false }))
        .then(resolve, reject);
    },
  };
  return builder;
}

function confirmedAuth(userId = USER_ID, email = USER_EMAIL) {
  return {
    async getUser() {
      return {
        data: {
          user: {
            id: userId,
            email,
            email_confirmed_at: new Date().toISOString(),
          },
        },
        error: null,
      };
    },
  };
}

function checkoutAdmin({ checkoutEnabled = true } = {}) {
  const state = {
    settings: {
      singleton: true,
      checkout_enabled: checkoutEnabled,
      expected_livemode: false,
      live_payment_approved: false,
      configuration_verified_at: new Date().toISOString(),
      maintenance_reason: checkoutEnabled ? '' : 'isolated fail-closed test',
    },
    draft: {
      id: DRAFT_ID,
      user_id: USER_ID,
      request_id: REQUEST_ID,
      plan_key: 'complete_revamp',
      status: 'draft',
      email: USER_EMAIL,
      reservation_id: null,
      checkout_session_id: null,
    },
    reservation: {
      id: RESERVATION_ID,
      user_id: USER_ID,
      from_tier_key: null,
      to_tier_key: 'complete_revamp',
      gross_cents: 20_000,
      credit_cents: 0,
      net_cents: 20_000,
      status: 'reserved',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      idempotency_key: REQUEST_ID,
      source_entitlement_id: null,
      checkout_session_id: null,
      stripe_price_id: null,
    },
    incidents: new Map(),
    reserveCalls: 0,
  };

  const admin = {
    auth: confirmedAuth(),
    async rpc(name) {
      if (name !== 'reserve_accessrevamp_upgrade') {
        return { data: null, error: { code: '42883', message: `Unexpected RPC ${name}` } };
      }
      state.reserveCalls += 1;
      return {
        data: {
          reservation_id: state.reservation.id,
          from_tier: state.reservation.from_tier_key,
          to_tier: state.reservation.to_tier_key,
          gross_cents: state.reservation.gross_cents,
          credit_cents: state.reservation.credit_cents,
          net_cents: state.reservation.net_cents,
          source_entitlement_id: state.reservation.source_entitlement_id,
          expires_at: state.reservation.expires_at,
          is_existing: state.reserveCalls > 1,
        },
        error: null,
      };
    },
    from(table) {
      return queryBuilder(({ operation, values, filters }) => {
        if (table === 'payment_runtime_settings') {
          if (operation === 'update') {
            if (matches(state.settings, filters)) Object.assign(state.settings, values);
            return { data: null, error: null };
          }
          return { data: matches(state.settings, filters) ? { ...state.settings } : null, error: null };
        }
        if (table === 'stripe_price_catalog') {
          const row = {
            transition_key: 'none->complete_revamp',
            stripe_price_id: PRICE_ID,
            net_cents: 20_000,
            currency: 'usd',
            livemode: false,
            active: true,
          };
          return { data: matches(row, filters) ? row : null, error: null };
        }
        if (table === 'order_drafts') {
          if (operation === 'update') {
            if (matches(state.draft, filters)) Object.assign(state.draft, values);
            return { data: null, error: null };
          }
          return {
            data: matches(state.draft, filters) ? { ...state.draft } : null,
            error: null,
          };
        }
        if (table === 'upgrade_reservations') {
          if (operation === 'update') {
            if (!matches(state.reservation, filters)) return { data: null, error: null };
            Object.assign(state.reservation, values);
            if (values.checkout_session_id) {
              state.draft.status = 'checkout_created';
              state.draft.reservation_id = state.reservation.id;
              state.draft.checkout_session_id = values.checkout_session_id;
            }
            if (values.status === 'canceled') state.draft.status = 'canceled';
            return { data: { id: state.reservation.id }, error: null };
          }
          return { data: matches(state.reservation, filters) ? { ...state.reservation } : null, error: null };
        }
        if (table === 'payment_security_incidents') {
          if (operation === 'upsert') {
            state.incidents.set(values.dedupe_key, { ...values });
            return { data: values, error: null };
          }
        }
        throw new Error(`Unexpected checkout table ${table}`);
      });
    },
  };
  return { admin, state };
}

function idempotentCheckoutStripe() {
  const sessionsByKey = new Map();
  let providerCreates = 0;
  let expireCalls = 0;
  return {
    stripe: {
      checkout: {
        sessions: {
          async create(_parameters, options) {
            await new Promise((resolve) => setTimeout(resolve, sessionsByKey.size % 3));
            if (!sessionsByKey.has(options.idempotencyKey)) {
              providerCreates += 1;
              sessionsByKey.set(options.idempotencyKey, {
                id: SESSION_ID,
                url: CHECKOUT_URL,
              });
            }
            return sessionsByKey.get(options.idempotencyKey);
          },
          async expire() {
            expireCalls += 1;
            return { id: SESSION_ID, status: 'expired' };
          },
        },
      },
    },
    metrics: {
      get providerCreates() { return providerCreates; },
      get expireCalls() { return expireCalls; },
      get uniqueIdempotencyKeys() { return sessionsByKey.size; },
    },
  };
}

function refundAdmin() {
  const state = {
    authorizationStatus: 'approved',
    providerRefundId: null,
    claimCalls: 0,
    successfulClaims: 0,
    attachCalls: 0,
    failCalls: 0,
    incidents: new Map(),
  };
  const claimed = {
    authorization_id: AUTHORIZATION_ID,
    order_id: ORDER_ID,
    payment_intent_id: 'pi_isolated_stress',
    amount_cents: 5_000,
    reason: 'Customer requested isolated test refund.',
    idempotency_key: '80000000-0000-4000-8000-000000000008',
  };
  const admin = {
    auth: confirmedAuth(OPERATOR_ID, 'operator@example.test'),
    async rpc(name) {
      if (name === 'claim_accessrevamp_refund_execution') {
        state.claimCalls += 1;
        if (state.authorizationStatus !== 'approved') {
          return { data: null, error: { code: '55000', message: 'Already claimed' } };
        }
        state.authorizationStatus = 'executing';
        state.successfulClaims += 1;
        return { data: claimed, error: null };
      }
      if (name === 'attach_accessrevamp_refund_provider') {
        state.attachCalls += 1;
        state.authorizationStatus = 'executed';
        state.providerRefundId = 're_isolated_stress';
        return { data: true, error: null };
      }
      if (name === 'fail_accessrevamp_refund_execution') {
        state.failCalls += 1;
        state.authorizationStatus = 'approved';
        return { data: true, error: null };
      }
      return { data: null, error: { code: '42883', message: `Unexpected RPC ${name}` } };
    },
    from(table) {
      return queryBuilder(({ operation, values, filters }) => {
        if (table === 'accessrevamp_operators') {
          const row = { user_id: OPERATOR_ID, active: true };
          return { data: matches(row, filters) ? row : null, error: null };
        }
        if (table === 'payment_security_incidents' && operation === 'upsert') {
          state.incidents.set(values.dedupe_key, { ...values });
          return { data: values, error: null };
        }
        throw new Error(`Unexpected refund table ${table}`);
      });
    },
  };
  return { admin, state };
}

function idempotentRefundStripe() {
  const refundsByKey = new Map();
  let providerCreates = 0;
  return {
    stripe: {
      refunds: {
        async create(parameters, options) {
          await new Promise((resolve) => setTimeout(resolve, refundsByKey.size % 3));
          if (!refundsByKey.has(options.idempotencyKey)) {
            providerCreates += 1;
            refundsByKey.set(options.idempotencyKey, {
              id: 're_isolated_stress',
              payment_intent: parameters.payment_intent,
              amount: parameters.amount,
              livemode: false,
              status: 'succeeded',
            });
          }
          return refundsByKey.get(options.idempotencyKey);
        },
      },
    },
    metrics: {
      get providerCreates() { return providerCreates; },
      get uniqueIdempotencyKeys() { return refundsByKey.size; },
    },
  };
}

function webhookAdmin() {
  const state = {
    settings: { singleton: true, expected_livemode: false },
    fulfilledEventIds: new Set(),
    refundEventIds: new Set(),
    fulfillmentWrites: 0,
    refundWrites: 0,
    cumulativeRefundedCents: 0,
    incidents: new Map(),
  };
  const admin = {
    async rpc(name, args) {
      if (name === 'fulfill_accessrevamp_checkout') {
        const eventId = args.p_payload.event_id;
        if (!state.fulfilledEventIds.has(eventId)) {
          state.fulfilledEventIds.add(eventId);
          state.fulfillmentWrites += 1;
        }
        return { data: true, error: null };
      }
      if (name === 'close_accessrevamp_checkout') return { data: true, error: null };
      if (name === 'reconcile_accessrevamp_refund') {
        const payload = args.p_payload;
        if (!state.refundEventIds.has(payload.event_id)) {
          state.refundEventIds.add(payload.event_id);
          state.refundWrites += 1;
          state.cumulativeRefundedCents = Math.max(
            state.cumulativeRefundedCents,
            payload.cumulative_refunded_cents,
          );
        }
        return { data: true, error: null };
      }
      return { data: null, error: { code: '42883', message: `Unexpected RPC ${name}` } };
    },
    from(table) {
      return queryBuilder(({ operation, values, filters }) => {
        if (table === 'payment_runtime_settings') {
          if (operation === 'update') {
            Object.assign(state.settings, values);
            return { data: null, error: null };
          }
          return { data: matches(state.settings, filters) ? { ...state.settings } : null, error: null };
        }
        if (table === 'stripe_price_catalog') {
          const row = {
            transition_key: 'none->complete_revamp',
            stripe_price_id: PRICE_ID,
            net_cents: 20_000,
            currency: 'usd',
            livemode: false,
            active: true,
          };
          return { data: matches(row, filters) ? row : null, error: null };
        }
        if (table === 'payment_security_incidents' && operation === 'upsert') {
          state.incidents.set(values.dedupe_key, { ...values });
          return { data: values, error: null };
        }
        throw new Error(`Unexpected webhook table ${table}`);
      });
    },
  };
  return { admin, state };
}

function webhookStripe(session) {
  return {
    webhooks: {
      async constructEventAsync(rawBody) {
        return JSON.parse(rawBody);
      },
    },
    checkout: {
      sessions: {
        async retrieve() {
          return structuredClone(session);
        },
      },
    },
    charges: {
      async retrieve() {
        return {
          id: 'ch_isolated_stress',
          payment_intent: 'pi_isolated_stress',
          amount_refunded: 5_000,
        };
      },
    },
  };
}

function checkoutEventFixture() {
  const metadata = {
    user_id: USER_ID,
    reservation_id: RESERVATION_ID,
    from_tier: 'none',
    to_tier: 'complete_revamp',
    gross_cents: '20000',
    credit_cents: '0',
    net_cents: '20000',
    source_entitlement_id: 'none',
    checkout_request_id: REQUEST_ID,
    order_draft_id: DRAFT_ID,
  };
  const session = {
    id: SESSION_ID,
    livemode: false,
    mode: 'payment',
    payment_status: 'paid',
    line_items: { data: [{ quantity: 1, price: PRICE_ID }] },
    amount_total: 20_000,
    currency: 'usd',
    client_reference_id: USER_ID,
    customer_details: { email: USER_EMAIL },
    customer_email: USER_EMAIL,
    payment_intent: 'pi_isolated_stress',
    customer: 'cus_isolated_stress',
    created: 1_784_570_000,
    metadata,
  };
  const event = {
    id: 'evt_isolated_checkout_success',
    type: 'checkout.session.completed',
    livemode: false,
    data: { object: { id: SESSION_ID } },
  };
  return { event, session };
}

const testEnvironment = {
  URL: ORIGIN,
  ALLOWED_ORIGINS: ORIGIN,
  STRIPE_EXPECT_LIVEMODE: 'false',
  ACCESSREVAMP_LIVE_PAYMENT_APPROVED: 'false',
  STRIPE_CHECKOUT_SECRET_KEY: 'sk_test_isolated_checkout',
  STRIPE_WEBHOOK_READ_SECRET_KEY: 'sk_test_isolated_webhook',
  STRIPE_REFUND_SECRET_KEY: 'sk_test_isolated_refund',
  STRIPE_WEBHOOK_SECRET: 'whsec_isolated_only',
};

test('exhaustive tier arithmetic remains exact under 75,003 quote attempts', {
  concurrency: false,
  timeout: 20_000,
}, () => {
  const targets = ['homepage_reveal', 'complete_revamp', 'cinematic_scroll'];
  let attempts = 0;
  for (const target of targets) {
    for (let paidCents = 0; paidCents <= 25_000; paidCents += 1) {
      attempts += 1;
      const currentRank = paidCents >= 25_000 ? 3 : paidCents >= 20_000 ? 2 : paidCents >= 5_000 ? 1 : 0;
      if (currentRank > TIERS[target].rank) {
        assert.throws(() => quoteUpgrade(paidCents, target), RangeError);
        continue;
      }
      const quote = quoteUpgrade(paidCents, target);
      assert.equal(quote.verifiedCreditCents, getEligibleCreditCents(paidCents, target));
      assert.equal(quote.listPriceCents, TIERS[target].listPriceCents);
      assert.equal(quote.dueNowCents + quote.verifiedCreditCents, quote.listPriceCents);
      assert.ok(quote.dueNowCents >= 0);
      assert.ok(quote.verifiedCreditCents >= 0);
      assert.ok(quote.verifiedCreditCents <= quote.listPriceCents);
    }
  }
  assert.equal(attempts, 75_003);
});

test('20,000 reservation metadata builds preserve exact key order and arithmetic', {
  concurrency: false,
  timeout: 20_000,
}, () => {
  const transitions = [
    [null, 'homepage_reveal', 5_000, 0],
    [null, 'complete_revamp', 20_000, 0],
    [null, 'cinematic_scroll', 25_000, 0],
    ['homepage_reveal', 'complete_revamp', 20_000, 5_000],
    ['homepage_reveal', 'cinematic_scroll', 25_000, 5_000],
    ['complete_revamp', 'cinematic_scroll', 25_000, 20_000],
  ];
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  for (let index = 1; index <= 20_000; index += 1) {
    const [fromTier, toTier, grossCents, creditCents] = transitions[index % transitions.length];
    const reservation = normalizeReservation({
      reservation_id: fixedUuid(index),
      from_tier: fromTier,
      to_tier: toTier,
      gross_cents: grossCents,
      credit_cents: creditCents,
      net_cents: grossCents - creditCents,
      source_entitlement_id: fromTier ? fixedUuid(index + 20_000) : null,
      expires_at: expiresAt,
      is_existing: index % 2 === 0,
    });
    const metadata = buildCheckoutMetadata(reservation, USER_ID, REQUEST_ID);
    assert.deepEqual(Object.keys(metadata), REQUIRED_CHECKOUT_METADATA_KEYS);
    assert.equal(Number(metadata.net_cents) + Number(metadata.credit_cents), Number(metadata.gross_cents));
    assert.equal(metadata.to_tier, toTier);
  }
});

test('250 simultaneous Checkout submissions converge on one Stripe session', {
  concurrency: false,
  timeout: 20_000,
}, async () => withEnvironment(testEnvironment, async () => {
  const { admin, state } = checkoutAdmin();
  const { stripe, metrics } = idempotentCheckoutStripe();
  const handler = createCheckoutHandler({ getAdmin: () => admin, createStripe: () => stripe });
  const responses = await Promise.all(Array.from({ length: 250 }, () => handler(request('/api/create-checkout', {
    body: { targetTier: 'complete_revamp', requestId: REQUEST_ID },
  }))));
  assert.ok(responses.every((response) => response.status === 201));
  const payloads = await Promise.all(responses.map((response) => response.json()));
  assert.ok(payloads.every((payload) => payload.url === CHECKOUT_URL));
  assert.equal(metrics.providerCreates, 1);
  assert.equal(metrics.uniqueIdempotencyKeys, 1);
  assert.equal(metrics.expireCalls, 0);
  assert.equal(state.reservation.status, 'checkout_created');
  assert.equal(state.draft.status, 'checkout_created');
  assert.equal(state.reservation.checkout_session_id, SESSION_ID);
  assert.equal(state.draft.checkout_session_id, SESSION_ID);
  assert.equal(state.incidents.size, 0);
}));

test('500 submissions fail closed before Stripe when Checkout is disabled', {
  concurrency: false,
  timeout: 20_000,
}, async () => withEnvironment(testEnvironment, async () => withoutServerNoise(async () => {
  const { admin, state } = checkoutAdmin({ checkoutEnabled: false });
  let stripeConstructionCalls = 0;
  const handler = createCheckoutHandler({
    getAdmin: () => admin,
    createStripe: () => {
      stripeConstructionCalls += 1;
      throw new Error('Stripe must not be reached while fail-closed.');
    },
  });
  const responses = await Promise.all(Array.from({ length: 500 }, () => handler(request('/api/create-checkout', {
    body: { targetTier: 'complete_revamp', requestId: REQUEST_ID },
  }))));
  assert.ok(responses.every((response) => response.status === 503));
  assert.equal(stripeConstructionCalls, 0);
  assert.equal(state.reserveCalls, 0);
  assert.equal(state.reservation.status, 'reserved');
  assert.equal(state.draft.status, 'draft');
}))); 

test('200 duplicate successful webhooks produce one durable fulfillment write', {
  concurrency: false,
  timeout: 20_000,
}, async () => withEnvironment(testEnvironment, async () => {
  const { event, session } = checkoutEventFixture();
  const { admin, state } = webhookAdmin();
  const stripe = webhookStripe(session);
  const handler = createWebhookHandler({ getAdmin: () => admin, createStripe: () => stripe });
  const responses = await Promise.all(Array.from({ length: 200 }, () => handler(new Request(`${ORIGIN}/api/stripe-webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': 'isolated-signature',
    },
    body: JSON.stringify(event),
  }))));
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(state.fulfilledEventIds.size, 1);
  assert.equal(state.fulfillmentWrites, 1);
  assert.equal(state.incidents.size, 0);
}));

test('200 out-of-order refund webhooks never multiply the cumulative refund', {
  concurrency: false,
  timeout: 20_000,
}, async () => withEnvironment(testEnvironment, async () => {
  const { admin, state } = webhookAdmin();
  const stripe = webhookStripe(checkoutEventFixture().session);
  const handler = createWebhookHandler({ getAdmin: () => admin, createStripe: () => stripe });
  const chargeEvent = {
    id: 'evt_isolated_charge_refunded',
    type: 'charge.refunded',
    livemode: false,
    data: {
      object: {
        id: 'ch_isolated_stress',
        payment_intent: 'pi_isolated_stress',
        amount_refunded: 5_000,
        refunds: { data: [{ reason: 'requested_by_customer' }] },
      },
    },
  };
  const refundEvent = {
    id: 'evt_isolated_refund_updated',
    type: 'refund.updated',
    livemode: false,
    data: {
      object: {
        id: 're_isolated_stress',
        charge: 'ch_isolated_stress',
        payment_intent: 'pi_isolated_stress',
        amount: 5_000,
        status: 'succeeded',
        reason: 'requested_by_customer',
      },
    },
  };
  const events = Array.from({ length: 200 }, (_, index) => index % 2 ? refundEvent : chargeEvent);
  const responses = await Promise.all(events.map((event) => handler(new Request(`${ORIGIN}/api/stripe-webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': 'isolated-signature',
    },
    body: JSON.stringify(event),
  }))));
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(state.refundEventIds.size, 2);
  assert.equal(state.refundWrites, 2);
  assert.equal(state.cumulativeRefundedCents, 5_000);
  assert.equal(state.incidents.size, 0);
}));

test('100 simultaneous refund executions permit exactly one provider refund', {
  concurrency: false,
  timeout: 20_000,
}, async () => withEnvironment(testEnvironment, async () => {
  const { admin, state } = refundAdmin();
  const { stripe, metrics } = idempotentRefundStripe();
  const handler = createRefundExecutionHandler({ getAdmin: () => admin, createStripe: () => stripe });
  const responses = await Promise.all(Array.from({ length: 100 }, () => handler(request('/api/refund-execute', {
    body: { authorizationId: AUTHORIZATION_ID },
  }))));
  const statuses = responses.map((response) => response.status);
  assert.equal(statuses.filter((status) => status === 202).length, 1);
  assert.equal(statuses.filter((status) => status === 409).length, 99);
  assert.equal(metrics.providerCreates, 1);
  assert.equal(metrics.uniqueIdempotencyKeys, 1);
  assert.equal(state.successfulClaims, 1);
  assert.equal(state.attachCalls, 1);
  assert.equal(state.failCalls, 0);
  assert.equal(state.authorizationStatus, 'executed');
  assert.equal(state.providerRefundId, 're_isolated_stress');
  assert.equal(state.incidents.size, 0);
}));

test('1,000 malformed or cross-origin Checkout requests never reach storage or Stripe', {
  concurrency: false,
  timeout: 20_000,
}, async () => withEnvironment(testEnvironment, async () => {
  let adminCalls = 0;
  let stripeCalls = 0;
  const handler = createCheckoutHandler({
    getAdmin: () => {
      adminCalls += 1;
      throw new Error('Storage must not be reached for malformed input.');
    },
    createStripe: () => {
      stripeCalls += 1;
      throw new Error('Stripe must not be reached for malformed input.');
    },
  });
  const cases = Array.from({ length: 1_000 }, (_, index) => {
    if (index % 4 === 0) return request('/api/create-checkout', {
      body: { targetTier: 'not-a-tier', requestId: REQUEST_ID },
    });
    if (index % 4 === 1) return request('/api/create-checkout', {
      body: { targetTier: 'complete_revamp', requestId: 'not-a-uuid' },
    });
    if (index % 4 === 2) return request('/api/create-checkout', {
      body: { targetTier: 'complete_revamp', requestId: REQUEST_ID, amount: 1 },
    });
    return request('/api/create-checkout', {
      body: { targetTier: 'complete_revamp', requestId: REQUEST_ID },
      origin: 'https://attacker.invalid',
    });
  });
  const responses = await Promise.all(cases.map((entry) => handler(entry)));
  assert.ok(responses.every((response) => response.status === 403 || response.status === 422));
  assert.equal(adminCalls, 0);
  assert.equal(stripeCalls, 0);
}));

test('isolated stress fixtures never contain live credentials or live object IDs', () => {
  const fixture = JSON.stringify({
    testEnvironment,
    ids: [PRICE_ID, SESSION_ID, CHECKOUT_URL],
    generated: randomUUID(),
  });
  assert.doesNotMatch(fixture, /sk_live_|rk_live_|cs_live_|pi_live_|re_live_/i);
  assert.match(fixture, /sk_test_/);
  assert.match(fixture, /cs_test_/);
});
