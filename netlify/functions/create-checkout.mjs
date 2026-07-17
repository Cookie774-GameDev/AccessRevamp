import { randomBytes } from 'node:crypto';
import Stripe from 'stripe';
import { assertJsonSize, assertMethod, assertSameOrigin, handleError, json } from './_shared/http.mjs';
import { checkoutSchema } from './_shared/validation.mjs';

const STRIPE_API_VERSION = '2026-06-24.dahlia';
const PLAN_PRICES = Object.freeze({
  homepage_reveal: process.env.STRIPE_HOMEPAGE_REVEAL_PRICE_ID || 'price_1TuGoNLzyGRcyGQJRjtGsiMV',
  quick_fix: process.env.STRIPE_QUICK_FIX_PRICE_ID || 'price_1TuGoTLzyGRcyGQJfdkqoE3f',
});

function randomLetters(length = 8) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = randomBytes(length);
  return [...bytes].map((value) => alphabet[value % alphabet.length]).join('');
}

export default async (request) => {
  try {
    assertMethod(request, 'POST');
    assertSameOrigin(request);
    assertJsonSize(request);
    const payload = checkoutSchema.parse(await request.json());
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe server configuration is missing.');

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
      appInfo: {
        name: 'AccessRevamp',
        version: '1.1.0',
      },
    });
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: PLAN_PRICES[payload.planKey], quantity: 1 }],
      customer_email: payload.email,
      customer_creation: 'always',
      billing_address_collection: 'required',
      allow_promotion_codes: false,
      submit_type: 'book',
      client_reference_id: payload.requestId,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      integration_identifier: `accessrevamp_${randomLetters()}`,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      metadata: {
        plan_key: payload.planKey,
        source: 'accessrevamp_website',
        checkout_request_id: payload.requestId,
      },
      payment_intent_data: {
        metadata: {
          plan_key: payload.planKey,
          source: 'accessrevamp_website',
          checkout_request_id: payload.requestId,
        },
      },
    }, {
      idempotencyKey: `accessrevamp_checkout_${payload.requestId}`,
    });

    if (!session.url) throw new Error('Stripe did not return a hosted Checkout URL.');
    return json({ url: session.url }, 201);
  } catch (error) {
    return handleError(error);
  }
};
