import Stripe from 'stripe';
import { z, ZodError } from 'zod';
import { assertStripePaymentMode } from './_shared/checkout-contract.mjs';
import { assertJsonSize, assertMethod, assertSameOrigin, handleError, HttpError, json, readJsonBody } from './_shared/http.mjs';
import { expectedLivemode, recordPaymentIncident } from './_shared/payment-runtime.mjs';
import { requireOperator } from './_shared/operator-auth.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const STRIPE_API_VERSION = '2026-06-24.dahlia';
const schema = z.object({ authorizationId: z.string().uuid() }).strict();

export function createRefundExecutionHandler({
  getAdmin = getSupabaseAdmin,
  createStripe = (key) => new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    appInfo: { name: 'AccessRevamp refunds', version: '1.0.0' },
  }),
} = {}) {
  return async function refundExecution(request) {
    let admin;
    let claimed;
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);
      let input;
      try {
        input = schema.parse(await readJsonBody(request));
      } catch (error) {
        if (error instanceof ZodError) throw new HttpError(422, 'Refund execution request is invalid.');
        throw error;
      }

      admin = getAdmin();
      const operator = await requireOperator(request, admin);
      const expected = expectedLivemode(process.env);
      const key = assertStripePaymentMode(process.env.STRIPE_REFUND_SECRET_KEY, process.env);
      const { data, error } = await admin.rpc('claim_accessrevamp_refund_execution', {
        p_authorization_id: input.authorizationId,
        p_operator_id: operator.id,
      });
      if (error) throw new HttpError(409, 'The refund authorization is not executable.');
      claimed = Array.isArray(data) ? data[0] : data;
      if (!claimed
        || !/^pi_[A-Za-z0-9_]+$/.test(claimed.payment_intent_id || '')
        || !Number.isSafeInteger(claimed.amount_cents)
        || claimed.amount_cents <= 0
        || !claimed.idempotency_key) {
        throw new HttpError(503, 'Refund execution data is unavailable.');
      }

      const stripe = createStripe(key);
      const refund = await stripe.refunds.create({
        payment_intent: claimed.payment_intent_id,
        amount: claimed.amount_cents,
        reason: 'requested_by_customer',
        metadata: {
          accessrevamp_authorization_id: claimed.authorization_id,
          accessrevamp_order_id: claimed.order_id,
          accessrevamp_operator_id: operator.id,
        },
      }, {
        idempotencyKey: `accessrevamp_refund_${claimed.idempotency_key}`,
      });

      if (!/^re_[A-Za-z0-9_]+$/.test(refund.id || '')
        || refund.payment_intent !== claimed.payment_intent_id
        || Number(refund.amount) !== claimed.amount_cents
        || refund.livemode !== expected) {
        await recordPaymentIncident(admin, {
          dedupeKey: `refund-provider-mismatch:${claimed.authorization_id}`,
          incidentType: 'unauthorized_refund',
          orderId: claimed.order_id,
          stripeObjectId: refund.id || null,
          details: { authorizationId: claimed.authorization_id },
        });
        throw new HttpError(503, 'Stripe refund response did not match the authorization.');
      }

      const attached = await admin.rpc('attach_accessrevamp_refund_provider', {
        p_authorization_id: claimed.authorization_id,
        p_stripe_refund_id: refund.id,
      });
      if (attached.error) {
        await recordPaymentIncident(admin, {
          dedupeKey: `refund-attach-failed:${refund.id}`,
          incidentType: 'webhook_failure',
          orderId: claimed.order_id,
          stripeObjectId: refund.id,
          details: { authorizationId: claimed.authorization_id, providerStatus: refund.status },
        });
        return json({ accepted: true, status: 'provider_accepted_reconciliation_pending' }, 202);
      }
      return json({ accepted: true, status: refund.status || 'pending' }, 202);
    } catch (error) {
      if (admin && claimed?.authorization_id && !String(error?.message || '').includes('did not match')) {
        await admin.rpc('fail_accessrevamp_refund_execution', {
          p_authorization_id: claimed.authorization_id,
          p_message: String(error?.name || 'ProviderError'),
        });
      }
      return handleError(error);
    }
  };
}

export default createRefundExecutionHandler();
