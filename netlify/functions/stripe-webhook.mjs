import { handleError, json } from './_shared/http.mjs';
import { getStripe } from './_shared/stripe-client.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const offers = Object.freeze({
  homepage_reveal: Object.freeze({ name: 'Homepage Reveal', amount: 5000 }),
  quick_fix: Object.freeze({ name: 'Quick Fix Plan', amount: 19900 }),
});
const checkoutEventTypes = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
]);
const MAX_WEBHOOK_BYTES = 1_000_000;

function expectedLivemode() {
  const value = process.env.STRIPE_EXPECTED_LIVEMODE;
  if (value !== 'true' && value !== 'false') {
    throw new Error('STRIPE_EXPECTED_LIVEMODE must be configured as true or false.');
  }
  return value === 'true';
}

export default async (request) => {
  let supabase;
  let eventId;
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const signature = request.headers.get('stripe-signature');
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return json({ error: 'Webhook configuration is incomplete.' }, 503);
    }
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_WEBHOOK_BYTES) {
      return json({ error: 'Webhook payload is too large.' }, 413);
    }

    const stripe = getStripe();
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BYTES) {
      return json({ error: 'Webhook payload is too large.' }, 413);
    }
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    if (event.livemode !== expectedLivemode()) {
      throw new Error('Stripe webhook mode did not match this deployment.');
    }

    eventId = event.id;
    supabase = getSupabaseAdmin();

    const stripeObject = event.data?.object || {};
    const { error: eventInsertError } = await supabase.from('ar_stripe_events').insert({
      id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      stripe_created_at: new Date(event.created * 1000).toISOString(),
      stripe_object_id: typeof stripeObject.id === 'string' ? stripeObject.id : null,
      status: 'processing',
      payload_summary: {
        api_version: event.api_version || null,
        object: stripeObject.object || null,
        request_id: event.request?.id || null,
      },
    });

    if (eventInsertError?.code === '23505') {
      const { data: existingEvent, error: existingEventError } = await supabase
        .from('ar_stripe_events')
        .select('status,processed_at')
        .eq('id', event.id)
        .single();
      if (existingEventError) throw existingEventError;
      if (existingEvent?.processed_at && ['processed', 'ignored'].includes(existingEvent.status)) {
        return json({ received: true, duplicate: true });
      }
      const { error: retryError } = await supabase
        .from('ar_stripe_events')
        .update({ status: 'processing', error_message: null })
        .eq('id', event.id);
      if (retryError) throw retryError;
    } else if (eventInsertError) {
      throw eventInsertError;
    }

    let finalEventStatus = 'ignored';
    if (checkoutEventTypes.has(event.type)) {
      finalEventStatus = 'processed';
      const session = event.data.object;
      const shouldFulfill = event.type === 'checkout.session.async_payment_succeeded'
        || (event.type === 'checkout.session.completed' && session.payment_status === 'paid');

      if (shouldFulfill) {
        const offerCode = session.metadata?.plan_key;
        const offer = offers[offerCode];
        const subtotal = Number(session.amount_subtotal ?? session.amount_total ?? 0);
        const total = Number(session.amount_total ?? 0);
        const currency = String(session.currency || 'usd').toLowerCase();
        const tax = Number(session.total_details?.amount_tax ?? (total - subtotal));

        if (!offer || subtotal !== offer.amount || total < subtotal || tax !== total - subtotal || currency !== 'usd') {
          throw new Error('Checkout amount, currency, tax, or offer metadata did not match the AccessRevamp catalog.');
        }

        const email = String(session.customer_details?.email || session.customer_email || '')
          .trim()
          .toLowerCase();
        if (!email) throw new Error('Paid checkout did not include a customer email.');

        const { data: order, error: orderError } = await supabase
          .from('ar_orders')
          .upsert({
            customer_email: email,
            website_url: session.metadata?.website_url || null,
            offer_code: offerCode,
            offer_name: offer.name,
            amount_cents: offer.amount,
            amount_total_cents: total,
            tax_cents: tax,
            currency,
            payment_status: 'paid',
            checkout_status: 'complete',
            stripe_session_id: session.id,
            stripe_payment_intent_id: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : null,
            paid_at: new Date().toISOString(),
            metadata: {
              stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
              stripe_event_id: event.id,
              source: session.metadata?.source || 'accessrevamp_website',
            },
          }, { onConflict: 'stripe_session_id' })
          .select('id')
          .single();
        if (orderError) throw orderError;

        const { error: linkError } = await supabase.rpc('ar_link_paid_order', {
          p_order_id: order.id,
        });
        if (linkError) throw linkError;
      }
    }

    const { error: processedError } = await supabase
      .from('ar_stripe_events')
      .update({
        status: finalEventStatus,
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', event.id);
    if (processedError) throw processedError;

    return json({ received: true });
  } catch (error) {
    if (supabase && eventId) {
      try {
        await supabase
          .from('ar_stripe_events')
          .update({
            status: 'failed',
            error_message: String(error?.message || error).slice(0, 1000),
          })
          .eq('id', eventId);
      } catch (recordError) {
        console.error('Could not record the Stripe event failure.', recordError);
      }
    }
    return handleError(error);
  }
};
