import { HttpError } from './http.mjs';

const ALLOWED_TRANSITIONS = new Set([
  'none->homepage_reveal',
  'none->complete_revamp',
  'none->cinematic_scroll',
  'homepage_reveal->complete_revamp',
  'homepage_reveal->cinematic_scroll',
  'complete_revamp->cinematic_scroll',
]);

export function expectedLivemode(env = process.env) {
  if (!['true', 'false'].includes(env.STRIPE_EXPECT_LIVEMODE || '')) {
    throw new HttpError(503, 'Payment mode is not configured.');
  }
  return env.STRIPE_EXPECT_LIVEMODE === 'true';
}

export async function requireCheckoutRuntime(admin, env = process.env) {
  const expected = expectedLivemode(env);
  const { data, error } = await admin
    .from('payment_runtime_settings')
    .select('checkout_enabled,expected_livemode,live_payment_approved,configuration_verified_at,maintenance_reason')
    .eq('singleton', true)
    .maybeSingle();

  if (error || !data) throw new HttpError(503, 'Payment configuration is unavailable.');
  const verifiedAt = Date.parse(data.configuration_verified_at || '');
  const recentlyVerified = Number.isFinite(verifiedAt) && verifiedAt >= Date.now() - 24 * 60 * 60 * 1000;
  if (!data.checkout_enabled
    || data.expected_livemode !== expected
    || !recentlyVerified
    || (expected && data.live_payment_approved !== true)) {
    throw new HttpError(503, 'Secure checkout is temporarily paused.');
  }

  return Object.freeze({
    expectedLivemode: expected,
    livePaymentApproved: data.live_payment_approved === true,
  });
}

export async function requireLiveCheckoutRuntime(admin, env = process.env) {
  const runtime = await requireCheckoutRuntime(admin, env);
  if (!runtime.expectedLivemode || !runtime.livePaymentApproved) {
    throw new HttpError(503, 'Secure checkout is not open yet.');
  }
  return runtime;
}

export async function resolveCatalogPrice(admin, quote, livemode) {
  if (!quote || !ALLOWED_TRANSITIONS.has(quote.transitionKey)) {
    throw new HttpError(503, 'Payment catalog is unavailable.');
  }
  const { data, error } = await admin
    .from('stripe_price_catalog')
    .select('stripe_price_id,net_cents,currency,livemode,active')
    .eq('transition_key', quote.transitionKey)
    .eq('active', true)
    .eq('livemode', livemode)
    .maybeSingle();

  if (error || !data
    || data.net_cents !== quote.dueNowCents
    || data.currency !== 'usd'
    || !/^price_[A-Za-z0-9_]+$/.test(data.stripe_price_id)) {
    throw new HttpError(503, 'Payment catalog is unavailable.');
  }
  return Object.freeze({ priceId: data.stripe_price_id, currency: data.currency });
}

export async function recordPaymentIncident(admin, {
  dedupeKey,
  incidentType,
  severity = 'critical',
  orderId = null,
  stripeObjectId = null,
  details = {},
}) {
  try {
    await admin.from('payment_security_incidents').upsert({
      dedupe_key: String(dedupeKey).slice(0, 240),
      incident_type: incidentType,
      severity,
      status: 'open',
      order_id: orderId,
      stripe_object_id: stripeObjectId,
      details,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'dedupe_key' });
  } catch {
    // Incident recording must never replace the original payment error.
  }
}
