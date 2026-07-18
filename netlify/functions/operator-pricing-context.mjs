import { assertJsonSize, assertMethod, assertSameOrigin, handleError, HttpError, json, readJsonBody } from './_shared/http.mjs';
import { requireOperator } from './_shared/operator-auth.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { privatePricingActionSchema } from './_shared/validation.mjs';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export default async (request) => {
  try {
    assertMethod(request, 'POST');
    assertSameOrigin(request);
    assertJsonSize(request);
    const parsed = privatePricingActionSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) throw new HttpError(422, 'Private pricing request is invalid.');

    const admin = getSupabaseAdmin();
    const operator = await requireOperator(request, admin);
    const input = parsed.data;
    if (input.action === 'revoke') {
      const { error } = await admin.rpc('revoke_accessrevamp_pricing_context', {
        p_context_id: input.contextId,
        p_operator_id: operator.id,
        p_reason: input.reason,
      });
      if (error) throw error;
      return json({ ok: true });
    }

    const expiry = new Date(input.expiresAt);
    const now = Date.now();
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= now || expiry.getTime() > now + 90 * 86_400_000) {
      throw new HttpError(422, 'Expiry must be within the next 90 days.');
    }
    const { data, error } = await admin.rpc('issue_accessrevamp_pricing_context', {
      p_customer_label: input.customerLabel,
      p_website_url: input.websiteUrl,
      p_scope_summary: input.scopeSummary,
      p_recommended_tier: input.recommendedTier,
      p_internal_reference: input.internalReference || null,
      p_expires_at: input.expiresAt,
      p_operator_id: operator.id,
    });
    if (error) throw error;
    if (!data?.id || !TOKEN_PATTERN.test(data?.token || '')) throw new Error('Pricing context issuance returned an invalid result.');
    const base = new URL(process.env.ACCESSREVAMP_SITE_URL || process.env.URL || request.url);
    return json({
      id: data.id,
      expiresAt: data.expiresAt,
      shareUrl: `${base.origin}/pricing#quote=${data.token}`,
    }, 201);
  } catch (error) { return handleError(error); }
};
