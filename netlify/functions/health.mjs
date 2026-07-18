import { json } from './_shared/http.mjs';

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
  return json({
    ok: true,
    service: 'accessrevamp',
    configured: {
      supabase: Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      contactRateLimit: Boolean(process.env.CONTACT_RATE_LIMIT_SECRET),
    },
  });
};
