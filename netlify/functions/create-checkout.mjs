import Stripe from 'stripe';
import { ZodError } from 'zod';
import { requireConfirmedUser } from './_shared/auth.mjs';
import {
  assertStripePaymentMode,
  buildCheckoutMetadata,
  normalizeReservation,
  quoteFromReservation,
  validatedStripeCheckoutUrl,
} from './_shared/checkout-contract.mjs';
import {
  assertJsonSize,
  assertMethod,
  assertSameOrigin,
  handleError,
  HttpError,
  json,
  readJsonBody,
} from './_shared/http.mjs';
import { getStripePriceForQuote } from './_shared/stripe-catalog.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { checkoutSchema } from './_shared/validation.mjs';

const STRIPE_API_VERSION = '2026-06-24.dahlia';

function reservationError(error) {
  if (['22023', '55000', '23505'].includes(String(error?.code || ''))) {
    return new HttpError(409, 'The requested checkout is not currently eligible.');
  }
  return new HttpError(503, 'Checkout reservation is unavailable.');
}

export function createCheckoutHandler({
  getAdmin = getSupabaseAdmin,
  createStripe = (key) => new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    appInfo: { name: 'AccessRevamp', version: '2.0.0' },
  }),
} = {}) {
  return async function checkoutHandler(request) {
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);

      let payload;
      try {
        payload = checkoutSchema.parse(await readJsonBody(request));
      } catch (error) {
        if (error instanceof ZodError) throw new HttpError(422, 'Request body is invalid.');
        throw error;
      }

      let admin;
      try {
        admin = getAdmin();
      } catch {
        throw new HttpError(503, 'Checkout service is unavailable.');
      }
      const user = await requireConfirmedUser(request, admin);
      const { data, error } = await admin.rpc('reserve_accessrevamp_upgrade', {
        p_user_id: user.id,
        p_target_tier_key: payload.targetTier,
        p_request_id: payload.requestId,
      });
      if (error) throw reservationError(error);

      const reservation = normalizeReservation(data);
      if (reservation.to_tier !== payload.targetTier) {
        throw new HttpError(503, 'Checkout reservation is unavailable.');
      }
      const quote = quoteFromReservation(reservation);
      const { priceId } = getStripePriceForQuote(quote, process.env);
      const metadata = buildCheckoutMetadata(reservation, user.id, payload.requestId);
      const key = assertStripePaymentMode(process.env.STRIPE_SECRET_KEY, process.env);
      const stripe = createStripe(key);
      const origin = new URL(request.url).origin;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email,
        customer_creation: 'always',
        billing_address_collection: 'required',
        allow_promotion_codes: false,
        client_reference_id: user.id,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cancel`,
        metadata,
        payment_intent_data: { metadata },
      }, {
        idempotencyKey: `accessrevamp_checkout_${user.id}_${payload.requestId}`,
      });

      const checkoutUrl = validatedStripeCheckoutUrl(session.url);
      const { data: attached, error: attachError } = await admin
        .from('upgrade_reservations')
        .update({
          status: 'checkout_created',
          checkout_session_id: session.id,
          stripe_price_id: priceId,
        })
        .eq('id', reservation.reservation_id)
        .eq('user_id', user.id)
        .in('status', ['reserved', 'checkout_created'])
        .select('id')
        .maybeSingle();

      if (attachError || !attached) {
        try { await stripe.checkout.sessions.expire(session.id); } catch { /* best-effort orphan containment */ }
        throw new HttpError(503, 'Checkout reservation could not be finalized.');
      }

      return json({ url: checkoutUrl }, 201);
    } catch (error) {
      return handleError(error);
    }
  };
}

export default createCheckoutHandler();
