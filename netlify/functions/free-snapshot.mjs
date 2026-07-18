import { createHmac } from 'node:crypto';
import { assertJsonSize, assertMethod, assertSameOrigin, handleError, json, requestIp } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { freeSnapshotSchema } from './_shared/validation.mjs';

export default async (request) => {
  try {
    assertMethod(request, 'POST'); assertSameOrigin(request); assertJsonSize(request);
    const input = freeSnapshotSchema.parse(await request.json());
    const secret = process.env.CONTACT_RATE_LIMIT_SECRET;
    if (!secret || secret.length < 24) throw new Error('Snapshot intake is unavailable.');
    const rateKey = createHmac('sha256', secret).update(requestIp(request)).digest('hex');
    const { data, error } = await getSupabaseAdmin().rpc('submit_accessrevamp_snapshot', {
      p_request_id: input.requestId, p_website_url: input.websiteUrl, p_contact_email: input.contactEmail,
      p_business_context: input.businessContext, p_rate_key: rateKey
    });
    if (error) {
      if (/rate limit/i.test(error.message)) return json({ status: 'rate-limited', error: 'Too many requests. Please try later.' }, 429);
      if (/duplicate/i.test(error.message)) return json({ status: 'duplicate' }, 409);
      throw error;
    }
    if (data?.status === 'duplicate') return json({ status: 'duplicate' }, 409);
    return json({ status: data?.status || 'accepted' }, 202);
  } catch (error) { return handleError(error); }
};
