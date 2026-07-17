import { createHmac } from 'node:crypto';
import { assertJsonSize, assertMethod, assertSameOrigin, handleError, json, requestIp } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { contactSchema } from './_shared/validation.mjs';

export default async (request) => {
  try {
    assertMethod(request, 'POST');
    assertSameOrigin(request);
    assertJsonSize(request);
    const payload = contactSchema.parse(await request.json());
    const secret = process.env.CONTACT_RATE_LIMIT_SECRET;
    if (!secret || secret.length < 24) throw new Error('Contact rate-limit secret is not configured.');
    const rateKey = createHmac('sha256', secret).update(requestIp(request)).digest('hex');
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('submit_accessrevamp_contact', {
      p_first_name: payload.firstName,
      p_last_name: payload.lastName,
      p_email: payload.email,
      p_website_url: payload.websiteUrl || null,
      p_message: payload.message,
      p_rate_key: rateKey,
      p_user_agent: (request.headers.get('user-agent') || '').slice(0, 500),
    });
    if (error) {
      if (/rate limit/i.test(error.message)) return json({ error: 'Too many requests. Please try again later.' }, 429);
      throw error;
    }
    return json({ ok: true, reference: data }, 201);
  } catch (error) {
    return handleError(error);
  }
};
