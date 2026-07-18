import { ZodError } from 'zod';
import { getTier, quoteUpgrade } from '../../src/config/tier-catalog.js';
import { requireConfirmedUser } from './_shared/auth.mjs';
import {
  assertJsonSize,
  assertMethod,
  assertSameOrigin,
  handleError,
  HttpError,
  json,
  readJsonBody,
} from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { entitlementQuoteSchema } from './_shared/validation.mjs';

const EXACT_PAID_CENTS = Object.freeze({
  homepage_reveal: 5000,
  complete_revamp: 20000,
  cinematic_scroll: 25000,
});

async function getActiveEntitlement(admin, userId) {
  let result;
  try {
    result = await admin
      .from('entitlements')
      .select('highest_tier_key,effective_paid_cents,status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
  } catch {
    throw new HttpError(503, 'Entitlement service is unavailable.');
  }
  if (result?.error) throw new HttpError(503, 'Entitlement service is unavailable.');
  if (!result?.data) return null;

  const entitlement = result.data;
  const expectedPaidCents = EXACT_PAID_CENTS[entitlement.highest_tier_key];
  if (entitlement.status !== 'active'
    || expectedPaidCents === undefined
    || entitlement.effective_paid_cents !== expectedPaidCents) {
    throw new HttpError(503, 'Entitlement service is unavailable.');
  }
  return entitlement;
}

export function createEntitlementQuoteHandler({ getAdmin = getSupabaseAdmin } = {}) {
  return async function entitlementQuoteHandler(request) {
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);

      let payload;
      try {
        payload = entitlementQuoteSchema.parse(await readJsonBody(request));
      } catch (error) {
        if (error instanceof ZodError) throw new HttpError(422, 'Request body is invalid.');
        throw error;
      }

      let admin;
      try {
        admin = getAdmin();
      } catch {
        throw new HttpError(503, 'Entitlement service is unavailable.');
      }
      const user = await requireConfirmedUser(request, admin);

      const entitlement = await getActiveEntitlement(admin, user.id);
      const paidCents = entitlement?.effective_paid_cents || 0;
      if (entitlement
        && getTier(entitlement.highest_tier_key).rank >= getTier(payload.targetTier).rank) {
        throw new HttpError(409, 'The requested upgrade is not eligible.');
      }

      let quote;
      try {
        quote = quoteUpgrade(paidCents, payload.targetTier);
      } catch (error) {
        if (error instanceof RangeError) {
          throw new HttpError(409, 'The requested upgrade is not eligible.');
        }
        throw error;
      }

      return json({
        targetTier: quote.targetTierKey,
        listPriceCents: quote.listPriceCents,
        creditCents: quote.verifiedCreditCents,
        dueNowCents: quote.dueNowCents,
        resultingTier: quote.resultingEntitlement,
      });
    } catch (error) {
      return handleError(error);
    }
  };
}

export default createEntitlementQuoteHandler();
