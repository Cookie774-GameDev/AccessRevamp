import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export const ORIGIN = 'https://accessrevamp.test';
export const TIER_AMOUNT = Object.freeze({ homepage_reveal: 5_000, complete_revamp: 20_000, cinematic_scroll: 25_000 });
export const PRICE = Object.freeze({
  'none->homepage_reveal': ['price_test_homepage', 5_000],
  'none->complete_revamp': ['price_test_complete', 20_000],
  'none->cinematic_scroll': ['price_test_cinematic', 25_000],
  'homepage_reveal->complete_revamp': ['price_test_homepage_complete', 15_000],
  'homepage_reveal->cinematic_scroll': ['price_test_homepage_cinematic', 20_000],
  'complete_revamp->cinematic_scroll': ['price_test_complete_cinematic', 5_000],
});

export function installIsolatedPaymentEnv() {
  Object.assign(process.env, {
    URL: ORIGIN,
    VITE_SITE_URL: ORIGIN,
    ALLOWED_ORIGINS: ORIGIN,
    STRIPE_EXPECT_LIVEMODE: 'false',
    ACCESSREVAMP_LIVE_PAYMENT_APPROVED: 'false',
    STRIPE_CHECKOUT_SECRET_KEY: 'sk_test_checkout_isolated',
    STRIPE_WEBHOOK_READ_SECRET_KEY: 'sk_test_webhook_isolated',
    STRIPE_REFUND_SECRET_KEY: 'sk_test_refund_isolated',
    STRIPE_WEBHOOK_SECRET: 'whsec_isolated',
  });
}

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

class Query {
  constructor(harness, table) {
    this.harness = harness;
    this.table = table;
    this.op = 'select';
    this.value = null;
    this.filters = [];
  }
  select() { return this; }
  update(value) { this.op = 'update'; this.value = value; return this; }
  upsert(value) { this.op = 'upsert'; this.value = value; return this; }
  eq(key, value) { this.filters.push((row) => row?.[key] === value); return this; }
  in(key, values) { this.filters.push((row) => values.includes(row?.[key])); return this; }
  maybeSingle() { return this.harness.query(this, true); }
  then(resolve, reject) { return this.harness.query(this, false).then(resolve, reject); }
  matches(row) { return this.filters.every((filter) => filter(row)); }
}

export class PaymentHarness {
  constructor() {
    this.users = new Map();
    this.operators = new Map();
    this.drafts = new Map();
    this.reservations = new Map();
    this.orders = new Map();
    this.projects = new Map();
    this.entitlements = new Map();
    this.authorizations = new Map();
    this.events = new Set();
    this.refundEvents = new Set();
    this.incidents = new Map();
    this.settings = {
      singleton: true,
      checkout_enabled: true,
      refunds_enabled: true,
      expected_livemode: false,
      live_payment_approved: false,
      require_two_person_refund: true,
      configuration_verified_at: new Date().toISOString(),
      maintenance_reason: '',
    };
    this.catalog = new Map(Object.entries(PRICE).map(([transition, [id, amount]]) => [transition, {
      transition_key: transition, stripe_price_id: id, net_cents: amount, currency: 'usd', livemode: false, active: true,
    }]));
    this.reservationLock = new Mutex();
    this.eventLock = new Mutex();
    this.refundLock = new Mutex();
    this.forceAttachFailure = false;
    this.admin = {
      auth: { getUser: async (token) => {
        await jitter();
        const user = this.users.get(token);
        return user ? { data: { user }, error: null } : { data: { user: null }, error: new Error('invalid token') };
      } },
      from: (table) => new Query(this, table),
      rpc: (name, args) => this.rpc(name, args),
    };
  }

  addUser(email = `user-${randomUUID()}@example.test`, token = `token-${randomUUID()}`) {
    const user = { id: randomUUID(), email: email.toLowerCase(), email_confirmed_at: new Date().toISOString() };
    this.users.set(token, user);
    return { user, token };
  }

  addDraft(user, planKey = 'complete_revamp') {
    const draft = {
      id: randomUUID(), user_id: user.id, request_id: randomUUID(), plan_key: planKey,
      status: 'draft', email: user.email, reservation_id: null, checkout_session_id: null, order_id: null,
    };
    this.drafts.set(`${user.id}:${draft.request_id}`, draft);
    return draft;
  }

  addOperator(user) { this.operators.set(user.id, { user_id: user.id, active: true }); }

  addAuthorization(operatorId, amount = 5_000) {
    const row = {
      id: randomUUID(), order_id: randomUUID(), payment_intent_id: `pi_${randomUUID().replaceAll('-', '')}`,
      amount_cents: amount, reason: 'Customer requested a refund before delivery.', idempotency_key: randomUUID(),
      status: 'approved', requested_by: operatorId, approved_by: randomUUID(), executed_by: null, stripe_refund_id: null,
    };
    this.authorizations.set(row.id, row);
    return row;
  }

  rows(table) {
    return ({
      payment_runtime_settings: [this.settings], stripe_price_catalog: [...this.catalog.values()],
      order_drafts: [...this.drafts.values()], upgrade_reservations: [...this.reservations.values()],
      accessrevamp_operators: [...this.operators.values()], orders: [...this.orders.values()],
      customer_projects: [...this.projects.values()], refund_authorizations: [...this.authorizations.values()],
      payment_security_incidents: [...this.incidents.values()],
    })[table] || [];
  }

  async query(query, single) {
    await jitter();
    const rows = this.rows(query.table).filter((row) => query.matches(row));
    if (query.op === 'select') return { data: single ? rows[0] || null : rows, error: null };
    if (query.op === 'upsert' && query.table === 'payment_security_incidents') {
      this.incidents.set(query.value.dedupe_key, { ...(this.incidents.get(query.value.dedupe_key) || {}), ...query.value });
      return { data: query.value, error: null };
    }
    if (query.op === 'update') {
      if (query.table === 'upgrade_reservations'
        && this.forceAttachFailure
        && query.value?.status === 'checkout_created') {
        return { data: single ? null : [], error: null };
      }
      for (const row of rows) {
        Object.assign(row, structuredClone(query.value));
        if (query.table === 'upgrade_reservations') this.syncDraft(row);
      }
      return { data: single ? rows[0] || null : rows, error: null };
    }
    return { data: null, error: null };
  }

  syncDraft(reservation) {
    const draft = this.drafts.get(`${reservation.user_id}:${reservation.idempotency_key}`);
    if (!draft || draft.status === 'paid') return;
    draft.reservation_id = reservation.id;
    draft.checkout_session_id = reservation.checkout_session_id || draft.checkout_session_id;
    if (['checkout_created', 'expired', 'canceled'].includes(reservation.status)) draft.status = reservation.status;
  }

  reservationPayload(row, existing) {
    return {
      reservation_id: row.id, from_tier: row.from_tier_key, to_tier: row.to_tier_key,
      gross_cents: row.gross_cents, credit_cents: row.credit_cents, net_cents: row.net_cents,
      source_entitlement_id: null, expires_at: row.expires_at, is_existing: existing,
    };
  }

  async rpc(name, args) {
    await jitter();
    if (name === 'reserve_accessrevamp_upgrade') return this.reservationLock.run(async () => {
      const key = `${args.p_user_id}:${args.p_request_id}`;
      const current = this.reservations.get(key);
      if (current && ['reserved', 'checkout_created'].includes(current.status)) return { data: this.reservationPayload(current, true), error: null };
      const amount = TIER_AMOUNT[args.p_target_tier_key];
      if (!amount) return { data: null, error: { code: '22023' } };
      const row = {
        id: randomUUID(), user_id: args.p_user_id, idempotency_key: args.p_request_id,
        from_tier_key: null, to_tier_key: args.p_target_tier_key, gross_cents: amount,
        credit_cents: 0, net_cents: amount, status: 'reserved',
        expires_at: new Date(Date.now() + 1_800_000).toISOString(), checkout_session_id: null, stripe_price_id: null,
      };
      this.reservations.set(key, row);
      return { data: this.reservationPayload(row, false), error: null };
    });

    if (name === 'fulfill_accessrevamp_checkout') return this.eventLock.run(async () => {
      const p = args.p_payload;
      if (this.events.has(p.event_id)) return { data: true, error: null };
      this.events.add(p.event_id);
      if ([...this.orders.values()].some((order) => order.checkout_request_id === p.checkout_request_id)) return { data: true, error: null };
      const order = {
        id: randomUUID(), user_id: p.user_id, reservation_id: p.reservation_id,
        checkout_request_id: p.checkout_request_id, stripe_checkout_session_id: p.checkout_session_id,
        stripe_payment_intent_id: p.payment_intent_id, plan_key: p.to_tier, amount_total: p.net_cents,
        currency: 'usd', status: 'paid',
      };
      this.orders.set(order.id, order);
      this.entitlements.set(order.user_id, { id: randomUUID(), user_id: order.user_id, source_order_id: order.id, status: 'active' });
      this.projects.set(order.id, { id: randomUUID(), order_id: order.id, user_id: order.user_id, status: 'active' });
      const reservation = [...this.reservations.values()].find((item) => item.id === p.reservation_id);
      if (reservation) reservation.status = 'paid';
      const draft = this.drafts.get(`${p.user_id}:${p.checkout_request_id}`);
      if (draft) Object.assign(draft, { status: 'paid', order_id: order.id });
      return { data: true, error: null };
    });

    if (name === 'close_accessrevamp_checkout') return this.eventLock.run(async () => {
      const p = args.p_payload;
      if (this.events.has(p.event_id)) return { data: true, error: null };
      this.events.add(p.event_id);
      const reservation = [...this.reservations.values()].find((item) => item.id === p.reservation_id);
      if (reservation && reservation.status !== 'paid') { reservation.status = p.terminal_status; this.syncDraft(reservation); }
      return { data: true, error: null };
    });

    if (name === 'claim_accessrevamp_refund_execution') return this.refundLock.run(async () => {
      const row = this.authorizations.get(args.p_authorization_id);
      if (!row || row.status !== 'approved') return { data: null, error: { code: '22023' } };
      Object.assign(row, { status: 'executing', executed_by: args.p_operator_id });
      return { data: [{
        authorization_id: row.id, order_id: row.order_id, payment_intent_id: row.payment_intent_id,
        amount_cents: row.amount_cents, reason: row.reason, idempotency_key: row.idempotency_key,
      }], error: null };
    });

    if (name === 'attach_accessrevamp_refund_provider') return this.refundLock.run(async () => {
      const row = this.authorizations.get(args.p_authorization_id);
      if (!row || row.status !== 'executing' || row.stripe_refund_id) return { data: null, error: { code: '55000' } };
      row.stripe_refund_id = args.p_stripe_refund_id;
      return { data: true, error: null };
    });

    if (name === 'fail_accessrevamp_refund_execution') return this.refundLock.run(async () => {
      const row = this.authorizations.get(args.p_authorization_id);
      if (row?.status === 'executing') Object.assign(row, { status: 'approved', executed_by: null });
      return { data: true, error: null };
    });

    if (name === 'reconcile_accessrevamp_refund') return this.refundLock.run(async () => {
      const p = args.p_payload;
      if (this.refundEvents.has(p.event_id)) return { data: true, error: null };
      this.refundEvents.add(p.event_id);
      const row = [...this.authorizations.values()].find((item) => item.stripe_refund_id === p.stripe_refund_id);
      if (row && p.refund_status === 'succeeded') row.status = 'executed';
      return { data: true, error: null };
    });

    return { data: null, error: new Error(`Unsupported RPC ${name}`) };
  }
}
