import Stripe from 'stripe';
import { handleError, json } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const expectedAmounts = Object.freeze({ homepage_reveal: 5000, quick_fix: 19900 });

export default async (request) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const signature = request.headers.get('stripe-signature');
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
      return json({ error: 'Webhook configuration is incomplete.' }, 503);
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const rawBody = await request.text();
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    const supabase = getSupabaseAdmin();

    const { error: eventInsertError } = await supabase.from('stripe_events').insert({
      id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      payload: event,
    });
    if (eventInsertError?.code === '23505') return json({ received: true, duplicate: true });
    if (eventInsertError) throw eventInsertError;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const planKey = session.metadata?.plan_key;
      const amount = Number(session.amount_total || 0);
      if (!expectedAmounts[planKey] || expectedAmounts[planKey] !== amount) {
        throw new Error('Checkout amount or plan metadata did not match the configured catalog.');
      }
      const email = String(session.customer_details?.email || session.customer_email || '').toLowerCase();
      let userId = null;
      if (email) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
        userId = profile?.id || null;
      }
      const { data: order, error: orderError } = await supabase.from('orders').upsert({
        user_id: userId,
        stripe_event_id: event.id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        customer_email: email || null,
        plan_key: planKey,
        amount_total: amount,
        currency: String(session.currency || 'usd').toLowerCase(),
        status: session.payment_status === 'paid' ? 'paid' : session.payment_status,
      }, { onConflict: 'stripe_checkout_session_id' }).select('id').single();
      if (orderError) throw orderError;
      if (userId) {
        const projectName = planKey === 'homepage_reveal' ? 'Homepage Reveal project' : 'Quick Fix project';
        const { error: projectError } = await supabase.from('customer_projects').upsert({
          user_id: userId,
          order_id: order.id,
          name: projectName,
          plan_key: planKey,
          status: 'intake_pending',
        }, { onConflict: 'order_id' });
        if (projectError) throw projectError;
      }
    }

    await supabase.from('stripe_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id);
    return json({ received: true });
  } catch (error) {
    return handleError(error);
  }
};
