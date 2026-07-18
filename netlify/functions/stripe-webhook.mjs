import Stripe from 'stripe';
import { getTier, quoteUpgrade } from '../../src/config/tier-catalog.js';
import { assertStripePaymentMode, REQUIRED_CHECKOUT_METADATA_KEYS } from './_shared/checkout-contract.mjs';
import { handleError, HttpError, json } from './_shared/http.mjs';
import { getStripePriceForQuote } from './_shared/stripe-catalog.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const STRIPE_API_VERSION = '2026-06-24.dahlia';
const CHECKOUT_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
]);
const REFUND_EVENTS = new Set(['charge.refunded', 'refund.updated']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertExpectedMode(livemode, env = process.env) {
  const expected = env.STRIPE_EXPECT_LIVEMODE;
  if (!['true', 'false'].includes(expected || '') || livemode !== (expected === 'true')) {
    throw new HttpError(503, 'Payment mode is not configured.');
  }
}

function exactInteger(value, name) {
  if (!/^(0|[1-9][0-9]*)$/.test(String(value || ''))) {
    throw new Error(`Invalid ${name} metadata.`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(`Invalid ${name} metadata.`);
  return number;
}

function requiredMetadata(session) {
  const metadata = session.metadata || {};
  for (const key of REQUIRED_CHECKOUT_METADATA_KEYS) {
    if (!Object.hasOwn(metadata, key) || typeof metadata[key] !== 'string' || !metadata[key]) {
      throw new Error('Checkout metadata is incomplete.');
    }
  }
  const userId = metadata.user_id;
  const reservationId = metadata.reservation_id;
  const requestId = metadata.checkout_request_id;
  const sourceEntitlementId = metadata.source_entitlement_id;
  if (!UUID_PATTERN.test(userId)
    || !UUID_PATTERN.test(reservationId)
    || !UUID_PATTERN.test(requestId)
    || (sourceEntitlementId !== 'none' && !UUID_PATTERN.test(sourceEntitlementId))) {
    throw new Error('Checkout identity metadata is invalid.');
  }

  const fromTier = metadata.from_tier;
  const toTier = metadata.to_tier;
  const grossCents = exactInteger(metadata.gross_cents, 'gross');
  const creditCents = exactInteger(metadata.credit_cents, 'credit');
  const netCents = exactInteger(metadata.net_cents, 'net');
  if (!['none', 'homepage_reveal', 'complete_revamp'].includes(fromTier)
    || !['homepage_reveal', 'complete_revamp', 'cinematic_scroll'].includes(toTier)
    || grossCents !== getTier(toTier).listPriceCents
    || netCents !== grossCents - creditCents
    || netCents <= 0) {
    throw new Error('Checkout tier metadata is invalid.');
  }
  const quote = quoteUpgrade(creditCents, toTier);
  if ((quote.fromTierKey || 'none') !== fromTier || quote.dueNowCents !== netCents) {
    throw new Error('Checkout transition metadata is invalid.');
  }
  return {
    userId,
    reservationId,
    requestId,
    sourceEntitlementId,
    fromTier,
    toTier,
    grossCents,
    creditCents,
    netCents,
    quote,
  };
}

function identifier(value) {
  return typeof value === 'string' ? value : value?.id || '';
}

function normalizeCheckout(event, session, env) {
  const metadata = requiredMetadata(session);
  const isTerminal = event.type === 'checkout.session.async_payment_failed'
    || event.type === 'checkout.session.expired';
  const lineItems = session.line_items?.data || [];
  const lineItem = lineItems[0];
  const expectedPriceId = getStripePriceForQuote(metadata.quote, env).priceId;
  const email = String(session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
  if (session.livemode !== event.livemode
    || session.mode !== 'payment'
    || lineItems.length !== 1
    || lineItem?.quantity !== 1
    || identifier(lineItem.price) !== expectedPriceId
    || Number(session.amount_total) !== metadata.netCents
    || String(session.currency || '').toLowerCase() !== 'usd'
    || session.client_reference_id !== metadata.userId
    || (!isTerminal && !email)
    || (!isTerminal && !identifier(session.payment_intent))) {
    throw new Error('Checkout did not match the reserved AccessRevamp payment.');
  }
  return {
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    user_id: metadata.userId,
    reservation_id: metadata.reservationId,
    checkout_session_id: session.id,
    payment_intent_id: identifier(session.payment_intent),
    customer_id: identifier(session.customer),
    customer_email: email,
    stripe_price_id: expectedPriceId,
    checkout_request_id: metadata.requestId,
    from_tier: metadata.fromTier,
    to_tier: metadata.toTier,
    gross_cents: metadata.grossCents,
    credit_cents: metadata.creditCents,
    net_cents: metadata.netCents,
    source_entitlement_id: metadata.sourceEntitlementId,
    session_created: session.created,
  };
}

async function handleCheckoutEvent(event, stripe, supabase, env) {
  const eventSession = event.data.object;
  const session = await stripe.checkout.sessions.retrieve(eventSession.id, {
    expand: ['line_items.data.price'],
  });
  const normalized = normalizeCheckout(event, session, env);

  if (event.type === 'checkout.session.async_payment_failed'
    || event.type === 'checkout.session.expired') {
    const { error } = await supabase.rpc('close_accessrevamp_checkout', {
      p_payload: {
        event_id: event.id,
        event_type: event.type,
        livemode: event.livemode,
        reservation_id: normalized.reservation_id,
        checkout_session_id: session.id,
        terminal_status: event.type.endsWith('.expired') ? 'expired' : 'canceled',
      },
    });
    if (error) throw error;
    return;
  }

  const shouldFulfill = event.type === 'checkout.session.async_payment_succeeded'
    || (event.type === 'checkout.session.completed' && session.payment_status === 'paid');
  if (!shouldFulfill) return;
  if (session.payment_status !== 'paid') throw new Error('Successful Checkout event was not paid.');

  const { error } = await supabase.rpc('fulfill_accessrevamp_checkout', { p_payload: normalized });
  if (error) throw error;
}

async function normalizedRefund(event, stripe) {
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const latestRefund = charge.refunds?.data?.at(-1);
    return {
      event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      stripe_refund_id: `charge_aggregate_${charge.id}`,
      payment_intent_id: identifier(charge.payment_intent),
      refund_amount_cents: Number(charge.amount_refunded),
      cumulative_refunded_cents: Number(charge.amount_refunded),
      refund_status: 'succeeded',
      reason: String(latestRefund?.reason || ''),
      operator_id: '',
    };
  }

  const refund = event.data.object;
  if (!['succeeded', 'failed', 'canceled'].includes(refund.status)) return null;
  const chargeId = identifier(refund.charge);
  if (!chargeId) throw new Error('Refund event did not include a charge.');
  const charge = await stripe.charges.retrieve(chargeId);
  return {
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    stripe_refund_id: refund.id,
    payment_intent_id: identifier(refund.payment_intent || charge.payment_intent),
    refund_amount_cents: Number(refund.amount),
    cumulative_refunded_cents: Number(charge.amount_refunded),
    refund_status: refund.status,
    reason: String(refund.reason || ''),
    operator_id: '',
  };
}

export function createWebhookHandler({
  getAdmin = getSupabaseAdmin,
  createStripe = (key) => new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    appInfo: { name: 'AccessRevamp', version: '2.0.0' },
  }),
} = {}) {
  return async function webhookHandler(request) {
    try {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      const signature = request.headers.get('stripe-signature');
      if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
        return json({ error: 'Webhook configuration is incomplete.' }, 503);
      }
      const key = assertStripePaymentMode(process.env.STRIPE_SECRET_KEY, process.env);
      const stripe = createStripe(key);
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > 1_000_000) {
        throw new HttpError(413, 'Webhook body is too large.');
      }
      const event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
      assertExpectedMode(event.livemode, process.env);
      const supabase = getAdmin();

      if (CHECKOUT_EVENTS.has(event.type)) {
        await handleCheckoutEvent(event, stripe, supabase, process.env);
      } else if (REFUND_EVENTS.has(event.type)) {
        const normalized = await normalizedRefund(event, stripe);
        if (normalized) {
          const { error } = await supabase.rpc('reconcile_accessrevamp_refund', { p_payload: normalized });
          if (error) throw error;
        }
      }
      return json({ received: true });
    } catch (error) {
      return handleError(error);
    }
  };
}

export default createWebhookHandler();
