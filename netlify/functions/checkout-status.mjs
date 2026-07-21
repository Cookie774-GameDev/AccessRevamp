import { requireConfirmedUser } from './_shared/auth.mjs';
import { assertMethod, handleError, HttpError, json } from './_shared/http.mjs';
import { recordPaymentIncident } from './_shared/payment-runtime.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const SESSION_PATTERN = /^cs_(test|live)_[A-Za-z0-9_]+$/;

export default async function checkoutStatus(request) {
  let admin;
  try {
    assertMethod(request, 'GET');
    const sessionId = new URL(request.url).searchParams.get('session_id') || '';
    if (!SESSION_PATTERN.test(sessionId)) throw new HttpError(422, 'Checkout session is invalid.');

    admin = getSupabaseAdmin();
    const user = await requireConfirmedUser(request, admin);
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id,plan_key,status,amount_total,currency,updated_at')
      .eq('user_id', user.id)
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();
    if (orderError) throw new HttpError(503, 'Payment status is temporarily unavailable.');
    if (order) {
      const [projectResult, entitlementResult] = await Promise.all([
        admin
          .from('customer_projects')
          .select('id,status')
          .eq('order_id', order.id)
          .eq('user_id', user.id)
          .maybeSingle(),
        admin
          .from('entitlements')
          .select('id,status,highest_tier_key')
          .eq('source_order_id', order.id)
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (projectResult.error || entitlementResult.error) {
        throw new HttpError(503, 'Project status is temporarily unavailable.');
      }
      const project = projectResult.data;
      const entitlement = entitlementResult.data;
      if (order.status === 'paid'
        && (!project || !entitlement || entitlement.status !== 'active')) {
        await recordPaymentIncident(admin, {
          dedupeKey: `paid-order-incomplete:${order.id}`,
          incidentType: 'unfulfilled_paid_checkout',
          orderId: order.id,
          stripeObjectId: sessionId,
          details: {
            missingProject: !project,
            missingEntitlement: !entitlement,
            entitlementStatus: entitlement?.status || null,
          },
        });
        return json({ status: 'processing' }, 202);
      }
      return json({
        status: order.status,
        planKey: order.plan_key,
        projectId: project?.id || null,
      });
    }

    const { data: reservation, error: reservationError } = await admin
      .from('upgrade_reservations')
      .select('id,status,to_tier_key,expires_at')
      .eq('user_id', user.id)
      .eq('checkout_session_id', sessionId)
      .maybeSingle();
    if (reservationError) throw new HttpError(503, 'Payment status is temporarily unavailable.');
    if (!reservation) return json({ status: 'unrecognized' }, 404);
    if (reservation.status === 'paid') {
      await recordPaymentIncident(admin, {
        dedupeKey: `paid-reservation-without-order:${reservation.id}`,
        incidentType: 'unfulfilled_paid_checkout',
        stripeObjectId: sessionId,
        details: { reservationId: reservation.id },
      });
      return json({ status: 'processing' }, 202);
    }
    if (['expired', 'canceled', 'reversed'].includes(reservation.status)) {
      return json({ status: reservation.status });
    }
    return json({ status: 'processing' }, 202);
  } catch (error) {
    return handleError(error);
  }
}
