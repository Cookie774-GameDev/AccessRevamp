import { createHash, createHmac } from 'node:crypto';
import { assertJsonSize, assertMethod, assertSameOrigin, handleError, HttpError, json, readJsonBody, requestIp } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { privatePricingResolveSchema } from './_shared/validation.mjs';

const unavailable = () => json({ error: 'Private pricing context is unavailable.' }, 404, {
  'cache-control': 'private, no-store, max-age=0',
  'referrer-policy': 'no-referrer',
});

export function createPricingContextHandler({ adminFactory = getSupabaseAdmin } = {}) {
  return async (request) => {
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);
      const parsed = privatePricingResolveSchema.safeParse(await readJsonBody(request));
      if (!parsed.success) throw new HttpError(422, 'Private pricing link is invalid.');

      const secret = process.env.CONTACT_RATE_LIMIT_SECRET;
      if (!secret || secret.length < 24) throw new HttpError(503, 'Private pricing context is unavailable.');
      const rateKey = createHmac('sha256', secret).update(requestIp(request)).digest('hex');
      const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
      const admin = adminFactory();
      const limit = await admin.rpc('consume_accessrevamp_pricing_resolution_limit', { p_rate_key: rateKey });
      if (limit.error) throw limit.error;
      if (limit.data !== true) return json({ error: 'Too many requests. Please try later.' }, 429);
      const { data, error } = await admin.rpc('resolve_accessrevamp_pricing_context', { p_token_hash: tokenHash });
      if (error) throw error;
      const context = Array.isArray(data) ? data[0] : data;
      if (!context) return unavailable();
      return json({ context }, 200, {
        'cache-control': 'private, no-store, max-age=0',
        'referrer-policy': 'no-referrer',
      });
    } catch (error) { return handleError(error); }
  };
}

export default createPricingContextHandler();
