import { assertJsonSize, assertMethod, assertSameOrigin, handleError, json } from './_shared/http.mjs';
import { getStripe, STRIPE_INTEGRATION_IDENTIFIER } from './_shared/stripe-client.mjs';
import { checkoutSchema } from './_shared/validation.mjs';

const PLAN_PRICES = Object.freeze({
  homepage_reveal: process.env.STRIPE_HOMEPAGE_REVEAL_PRICE_ID || 'price_1TuGoNLzyGRcyGQJRjtGsiMV',
  quick_fix: process.env.STRIPE_QUICK_FIX_PRICE_ID || 'price_1TuGoTLzyGRcyGQJfdkqoE3f',
});

export default async (request) => {
  try {
    assertMethod(request, 'POST');
    assertSameOrigin(request);
    assertJsonSize(request);

    const payload = checkoutSchema.parse(await request.json());
    const stripe = getStripe();
    const origin = new URL(request.url).origin;
    const metadata = {
      plan_key: payload.planKey,
      source: 'accessrevamp_website',
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      integration_identifier: STRIPE_INTEGRATION_IDENTIFIER,
      line_items: [{ price: PLAN_PRICES[payload.planKey], quantity: 1 }],
      customer_email: payload.email,
      customer_creation: 'always',
      billing_address_collection: 'required',
      allow_promotion_codes: false,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      metadata,
      payment_intent_data: { metadata },
    });

    if (!session.url) throw new Error('Stripe did not return a hosted Checkout URL.');
    return json({ url: session.url }, 201);
  } catch (error) {
    return handleError(error);
  }
};
