import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { ORIGIN } from './isolated-payment-core.mjs';

class Mutex {
  #tail = Promise.resolve();
  async run(fn) {
    let release;
    const next = new Promise((resolve) => { release = resolve; });
    const previous = this.#tail;
    this.#tail = next;
    await previous;
    try { return await fn(); } finally { release(); }
  }
}

const jitter = () => new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 3)));

export class FakeStripe {
  constructor(harness) {
    this.harness = harness;
    this.checkoutLock = new Mutex();
    this.refundLock = new Mutex();
    this.sessions = new Map();
    this.sessionsByKey = new Map();
    this.refundsByKey = new Map();
    this.checkoutAttempts = 0;
    this.checkoutCreations = 0;
    this.refundAttempts = 0;
    this.refundCreations = 0;
    this.expired = new Set();
    this.failRefundResponseOnce = false;
    this.failedRefundResponse = false;
    this.checkout = { sessions: {
      create: (params, options) => this.createSession(params, options),
      expire: (id) => this.expireSession(id),
      retrieve: (id) => this.retrieveSession(id),
    } };
    this.webhooks = { constructEventAsync: async (body, signature, secret) => {
      if (signature !== 'isolated-signature' || secret !== process.env.STRIPE_WEBHOOK_SECRET) throw new Error('Invalid signature');
      return JSON.parse(body);
    } };
    this.refunds = { create: (params, options) => this.createRefund(params, options) };
    this.charges = { retrieve: async (id) => ({ id, payment_intent: 'pi_charge_test', amount_refunded: 5_000 }) };
  }

  async createSession(params, options = {}) {
    this.checkoutAttempts += 1;
    return this.checkoutLock.run(async () => {
      await jitter();
      if (this.sessionsByKey.has(options.idempotencyKey)) return this.sessionsByKey.get(options.idempotencyKey);
      const id = `cs_test_${String(++this.checkoutCreations).padStart(6, '0')}`;
      const price = [...this.harness.catalog.values()].find((item) => item.stripe_price_id === params.line_items[0].price);
      const session = {
        id, url: `https://checkout.stripe.com/c/pay/${id}`, livemode: false, mode: 'payment', payment_status: 'unpaid',
        amount_total: price?.net_cents, currency: 'usd', client_reference_id: params.client_reference_id,
        customer_email: params.customer_email, customer_details: { email: params.customer_email },
        customer: `cus_${id}`, payment_intent: null, metadata: structuredClone(params.metadata),
        line_items: { data: [{ quantity: 1, price: params.line_items[0].price }] }, created: Math.floor(Date.now() / 1000),
      };
      this.sessionsByKey.set(options.idempotencyKey, session);
      this.sessions.set(id, session);
      return session;
    });
  }

  async expireSession(id) { this.expired.add(id); const row = this.sessions.get(id); if (row) row.status = 'expired'; return row; }
  async retrieveSession(id) { await jitter(); const row = this.sessions.get(id); if (!row) throw new Error('Unknown session'); return structuredClone(row); }
  markPaid(id) { const row = this.sessions.get(id); assert.ok(row); row.payment_status = 'paid'; row.payment_intent = `pi_${randomUUID().replaceAll('-', '')}`; return row; }

  async createRefund(params, options = {}) {
    this.refundAttempts += 1;
    return this.refundLock.run(async () => {
      await jitter();
      let row = this.refundsByKey.get(options.idempotencyKey);
      if (!row) {
        row = {
          id: `re_test_${String(++this.refundCreations).padStart(6, '0')}`,
          payment_intent: params.payment_intent, amount: params.amount, status: 'succeeded', livemode: false,
        };
        this.refundsByKey.set(options.idempotencyKey, row);
      }
      if (this.failRefundResponseOnce && !this.failedRefundResponse) {
        this.failedRefundResponse = true;
        throw Object.assign(new Error('Response lost after provider acceptance'), { name: 'ConnectionReset' });
      }
      return structuredClone(row);
    });
  }
}

export function checkoutRequest({ token, requestId, targetTier = 'complete_revamp', origin = ORIGIN, method = 'POST', contentType = 'application/json', body } = {}) {
  const headers = new Headers();
  if (origin !== null) headers.set('origin', origin);
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (contentType) headers.set('content-type', contentType);
  return new Request(`${ORIGIN}/api/create-checkout`, {
    method, headers, body: ['GET', 'HEAD'].includes(method) ? undefined : body ?? JSON.stringify({ targetTier, requestId }),
  });
}

export function webhookRequest(event, body) {
  return new Request(`${ORIGIN}/api/stripe-webhook`, {
    method: 'POST', headers: { 'stripe-signature': 'isolated-signature', 'content-type': 'application/json' },
    body: body ?? JSON.stringify(event),
  });
}

export function refundRequest(token, authorizationId) {
  return new Request(`${ORIGIN}/api/refund-execute`, {
    method: 'POST', headers: { origin: ORIGIN, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ authorizationId }),
  });
}

export async function readJson(response) { return response.json().catch(() => ({})); }
