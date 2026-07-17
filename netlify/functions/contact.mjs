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
    if (!secret || secret.length < 32) {
      throw new Error('Contact rate-limit secret is not configured.');
    }

    const ipHash = createHmac('sha256', secret).update(requestIp(request)).digest('hex');
    const requestFingerprint = createHmac('sha256', secret)
      .update(`${ipHash}:${payload.email}:${payload.websiteUrl || ''}`)
      .digest('hex');
    const supabase = getSupabaseAdmin();

    const { data: allowed, error: limitError } = await supabase.rpc('ar_enforce_rate_limit', {
      p_key_hash: ipHash,
      p_action: 'public_contact_form',
      p_limit: 5,
      p_window_seconds: 3600,
    });
    if (limitError) throw limitError;
    if (!allowed) {
      return json({ error: 'Too many requests. Please try again later.' }, 429);
    }

    const { data, error } = await supabase
      .from('ar_contact_messages')
      .insert({
        name: [payload.firstName, payload.lastName].filter(Boolean).join(' '),
        email: payload.email,
        website_url: payload.websiteUrl || null,
        topic: 'general',
        message: payload.message,
        status: 'new',
        request_fingerprint: requestFingerprint,
        metadata: {
          consent: true,
          user_agent: (request.headers.get('user-agent') || '').slice(0, 500),
        },
      })
      .select('id')
      .single();
    if (error) throw error;

    return json({ ok: true, reference: data.id }, 201);
  } catch (error) {
    return handleError(error);
  }
};
