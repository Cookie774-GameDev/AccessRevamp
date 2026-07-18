import Stripe from 'stripe';
import { quoteUpgrade } from '../../src/config/tier-catalog.js';
import { handleError, json } from './_shared/http.mjs';
import { getStripePriceForQuote } from './_shared/stripe-catalog.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const STRIPE_API_VERSION = '2026-06-24.dahlia';
const checkoutEventTypes = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
]);

function assertExpectedMode(event) {
  const configured = process.env.STRIPE_EXPECT_LIVEMODE;
  if (!['true', 'false'].includes(configured || '')) return;
  if (event.livemode !== (configured === 'true')) {
    throw new Error('Stripe event mode did not match STRIPE_EXPECT_LIVEMODE.');
  }
}

export default async (request) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const signature = request.headers.get('stripe-signature');
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
      return json({ error: 'Webhook configuration is incomplete.' }, 503);
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
      appInfo: { name: 'AccessRevamp', version: '1.2.0' },
    });
    const rawBody = await request.text();
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    assertExpectedMode(event);
    const supabase = getSupabaseAdmin();

    const { error: eventInsertError } = await supabase.from('stripe_events').insert({
      id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      payload: event,
    });

    if (eventInsertError?.code === '23505') {
      const { data: existingEvent, error: existingEventError } = await supabase
        .from('stripe_events')
        .select('processed_at')
        .eq('id', event.id)
        .single();
      if (existingEventError) throw existingEventError;
      if (existingEvent?.processed_at) return json({ received: true, duplicate: true });
      // A previous attempt recorded the event but did not finish. Continue so Stripe retries can recover.
    } else if (eventInsertError) {
      throw eventInsertError;
    }

    if (checkoutEventTypes.has(event.type)) {
      const eventSession = event.data.object;
      const session = await stripe.checkout.sessions.retrieve(eventSession.id, {
        expand: ['line_items.data.price'],
      });
      const shouldFulfill = event.type === 'checkout.session.async_payment_succeeded'
        || (event.type === 'checkout.session.completed' && session.payment_status === 'paid');

      if (shouldFulfill) {
        const planKey = session.metadata?.plan_key;
        const quote = quoteUpgrade(0, planKey);
        const expectedPriceId = getStripePriceForQuote(quote, process.env).priceId;
        const expectedAmount = quote.dueNowCents;
        const lineItems = session.line_items?.data || [];
        const lineItem = lineItems[0];
        const priceId = typeof lineItem?.price === 'string' ? lineItem.price : lineItem?.price?.id;
        const amount = Number(session.amount_total || 0);
        const currency = String(session.currency || '').toLowerCase();
        if (
          !expectedAmount
          || session.mode !== 'payment'
          || session.payment_status !== 'paid'
          || lineItems.length !== 1
          || lineItem?.quantity !== 1
          || priceId !== expectedPriceId
          || expectedAmount !== amount
          || currency !== 'usd'
        ) {
          throw new Error('Checkout price, amount, currency, mode, or plan metadata did not match the configured catalog.');
        }

        const email = String(session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
        if (!email) throw new Error('Paid checkout did not include a customer email.');

        const { data: order, error: orderError } = await supabase.from('orders').upsert({
          stripe_event_id: event.id,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
          customer_email: email,
          plan_key: planKey,
          amount_total: amount,
          currency,
          status: 'paid',
        }, { onConflict: 'stripe_checkout_session_id' }).select('id').single();
        if (orderError) throw orderError;

        const { error: linkError } = await supabase.rpc('link_accessrevamp_paid_order', {
          p_order_id: order.id,
        });
        if (linkError) throw linkError;
      }
    }

    const { error: processedError } = await supabase
      .from('stripe_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', event.id);
    if (processedError) throw processedError;

    return json({ received: true });
  } catch (error) {
    return handleError(error);
  }
};
