import { z } from 'zod';
import { HttpError } from './http.mjs';

export const REQUIRED_CHECKOUT_METADATA_KEYS = Object.freeze([
  'user_id',
  'reservation_id',
  'from_tier',
  'to_tier',
  'gross_cents',
  'credit_cents',
  'net_cents',
  'source_entitlement_id',
  'checkout_request_id',
]);

const paidTier = z.enum(['homepage_reveal', 'complete_revamp', 'cinematic_scroll']);

export const reservationSchema = z.object({
  reservation_id: z.string().uuid(),
  from_tier: paidTier.nullable(),
  to_tier: paidTier,
  gross_cents: z.number().int().positive().max(25000),
  credit_cents: z.number().int().nonnegative().max(25000),
  net_cents: z.number().int().positive().max(25000),
  source_entitlement_id: z.string().uuid().nullable(),
  expires_at: z.string().datetime({ offset: true }),
  is_existing: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.net_cents !== value.gross_cents - value.credit_cents) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Reservation arithmetic is invalid.' });
  }
  const expectedCredit = value.from_tier === 'homepage_reveal'
    ? 5000
    : value.from_tier === 'complete_revamp' ? 20000 : 0;
  if (value.credit_cents !== expectedCredit) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Reservation credit is invalid.' });
  }
});

export function normalizeReservation(data) {
  const row = Array.isArray(data) ? data[0] : data;
  const result = reservationSchema.safeParse(row);
  if (!result.success) throw new HttpError(503, 'Checkout reservation is unavailable.');
  if (new Date(result.data.expires_at).getTime() <= Date.now()) {
    throw new HttpError(409, 'The checkout reservation has expired.');
  }
  return result.data;
}

export function quoteFromReservation(reservation) {
  return Object.freeze({
    transitionKey: `${reservation.from_tier || 'none'}->${reservation.to_tier}`,
    dueNowCents: reservation.net_cents,
  });
}

export function buildCheckoutMetadata(reservation, userId, requestId) {
  const metadata = {
    user_id: userId,
    reservation_id: reservation.reservation_id,
    from_tier: reservation.from_tier || 'none',
    to_tier: reservation.to_tier,
    gross_cents: String(reservation.gross_cents),
    credit_cents: String(reservation.credit_cents),
    net_cents: String(reservation.net_cents),
    source_entitlement_id: reservation.source_entitlement_id || 'none',
    checkout_request_id: requestId,
  };
  if (Object.keys(metadata).some((key, index) => key !== REQUIRED_CHECKOUT_METADATA_KEYS[index])) {
    throw new HttpError(503, 'Checkout metadata is unavailable.');
  }
  return Object.freeze(metadata);
}

export function assertStripePaymentMode(secretKey, env = process.env) {
  const key = String(secretKey || '').trim();
  const expected = env.STRIPE_EXPECT_LIVEMODE;
  if (!['true', 'false'].includes(expected || '')) {
    throw new HttpError(503, 'Payment mode is not configured.');
  }
  const isTestKey = key.startsWith('sk_test_');
  const isProductionKey = key.startsWith('sk_live_');
  if (expected === 'false' && !isTestKey) throw new HttpError(503, 'Payment mode is not configured.');
  if (expected === 'true'
    && (!isProductionKey || env.ACCESSREVAMP_LIVE_PAYMENT_APPROVED !== 'true')) {
    throw new HttpError(503, 'Live payment activation is not approved.');
  }
  return key;
}

export function validatedStripeCheckoutUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(503, 'Checkout destination is unavailable.');
  }
  if (url.protocol !== 'https:'
    || url.hostname !== 'checkout.stripe.com'
    || url.username
    || url.password) {
    throw new HttpError(503, 'Checkout destination is unavailable.');
  }
  return url.toString();
}
