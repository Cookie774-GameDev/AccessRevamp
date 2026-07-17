import { json } from './_shared/http.mjs';

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);

  const stripeMode = process.env.STRIPE_EXPECTED_LIVEMODE;
  return json({
    ok: true,
    service: 'accessrevamp',
    release: process.env.COMMIT_REF?.slice(0, 12) || null,
    configured: {
      supabase: Boolean(
        (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
        && process.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
      stripeCheckout: Boolean(process.env.STRIPE_SECRET_KEY),
      stripeWebhook: Boolean(
        process.env.STRIPE_WEBHOOK_SECRET
        && (stripeMode === 'true' || stripeMode === 'false'),
      ),
      contactRateLimit: Boolean(process.env.CONTACT_RATE_LIMIT_SECRET),
      privatePreviews: Boolean(process.env.PREVIEW_TOKEN_SECRET),
      unsubscribe: Boolean(process.env.UNSUBSCRIBE_SECRET),
      outreachIdentity: Boolean(
        process.env.SENDER_FULL_NAME
        && process.env.SENDER_EMAIL
        && process.env.BUSINESS_POSTAL_ADDRESS,
      ),
    },
  });
};
