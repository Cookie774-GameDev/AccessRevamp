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
import {
  recordPaymentIncident,
  requireCheckoutRuntime,
  resolveCatalogPrice,
} from './_shared/payment-runtime.mjs';
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
    appInfo: { name: 'AccessRevamp', version: '3.0.0' },
  }),
} = {}) {
  return async function checkoutHandler(request) {
    let admin;
    let reservation;
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

      try {
        admin = getAdmin();
      } catch {
        throw new HttpError(503, 'Checkout service is unavailable.');
      }
      const user = await requireConfirmedUser(request, admin);
      const runtime = await requireCheckoutRuntime(admin, process.env);

      const { data: draft, error: draftError } = await admin
        .from('order_drafts')
        .select('id,plan_key,status,email')
        .eq('user_id', user.id)
        .eq('request_id', payload.requestId)
        .maybeSingle();
      if (draftError) throw new HttpError(503, 'The saved project request is unavailable.');
      if (!draft
        || draft.status !== 'draft'
        || draft.plan_key !== payload.targetTier
        || draft.email !== user.email) {
        throw new HttpError(409, 'Save a matching project request before checkout.');
      }

      const { data, error } = await admin.rpc('reserve_accessrevamp_upgrade', {
        p_user_id: user.id,
        p_target_tier_key: payload.targetTier,
        p_request_id: payload.requestId,
      });
      if (error) throw reservationError(error);

      reservation = normalizeReservation(data);
      if (reservation.to_tier !== payload.targetTier) {
        throw new HttpError(503, 'Checkout reservation is unavailable.');
      }
      const quote = quoteFromReservation(reservation);
      const { priceId } = await resolveCatalogPrice(admin, quote, runtime.expectedLivemode);
      const metadata = {
        ...buildCheckoutMetadata(reservation, user.id, payload.requestId),
        order_draft_id: draft.id,
      };
      const modeEnvironment = {
        ...process.env,
        STRIPE_EXPECT_LIVEMODE: String(runtime.expectedLivemode),
        ACCESSREVAMP_LIVE_PAYMENT_APPROVED: String(runtime.livePaymentApproved),
      };
      const key = assertStripePaymentMode(process.env.STRIPE_CHECKOUT_SECRET_KEY, modeEnvironment);
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
      const [{ data: attached, error: attachError }, { error: draftAttachError }] = await Promise.all([
        admin
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
          .maybeSingle(),
        admin
          .from('order_drafts')
          .update({
            status: 'checkout_created',
            reservation_id: reservation.reservation_id,
            checkout_session_id: session.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draft.id)
          .eq('user_id', user.id)
          .eq('status', 'draft'),
      ]);

      if (attachError || draftAttachError || !attached) {
        try { await stripe.checkout.sessions.expire(session.id); } catch { /* Best-effort orphan containment. */ }
        await recordPaymentIncident(admin, {
          dedupeKey: `checkout-attach-failed:${session.id}`,
          incidentType: 'configuration_failure',
          stripeObjectId: session.id,
          details: { reservationId: reservation.reservation_id, draftId: draft.id },
        });
        throw new HttpError(503, 'Checkout reservation could not be finalized.');
      }

      await admin.from('payment_runtime_settings')
        .update({ last_checkout_created_at: new Date().toISOString() })
        .eq('singleton', true);
      return json({ url: checkoutUrl }, 201);
    } catch (error) {
      if (admin && reservation && Number(error?.status || 500) >= 500) {
        await recordPaymentIncident(admin, {
          dedupeKey: `checkout-create-failed:${reservation.reservation_id}`,
          incidentType: 'configuration_failure',
          details: { reservationId: reservation.reservation_id },
        });
      }
      return handleError(error);
    }
  };
}

export default createCheckoutHandler();
