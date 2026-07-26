import { assertMethod, handleError, json } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { checkoutProductionReadiness, expectedLivemode } from './_shared/payment-runtime.mjs';

const EXPECTED_CATALOG = new Map([
  ['none->homepage_reveal', 5_000],
  ['none->complete_revamp', 20_000],
  ['none->cinematic_scroll', 25_000],
  ['homepage_reveal->complete_revamp', 15_000],
  ['homepage_reveal->cinematic_scroll', 20_000],
  ['complete_revamp->cinematic_scroll', 5_000],
]);

export default async function paymentHealth(request) {
  try {
    assertMethod(request, 'GET');
    const admin = getSupabaseAdmin();
    const expected = expectedLivemode(process.env);
    const [
      { data: settings, error: settingsError },
      { data: catalog, error: catalogError },
      productionReadiness,
    ] = await Promise.all([
      admin.from('payment_runtime_settings')
        .select('checkout_enabled,expected_livemode,live_payment_approved,configuration_verified_at')
        .eq('singleton', true)
        .maybeSingle(),
      admin.from('stripe_price_catalog')
        .select('transition_key,net_cents,currency,livemode,active')
        .eq('active', true)
        .eq('livemode', expected),
      checkoutProductionReadiness(admin, expected),
    ]);
    const verifiedAt = Date.parse(settings?.configuration_verified_at || '');
    const secretsReady = Boolean(
      (process.env.STRIPE_CHECKOUT_SECRET_KEY || '').startsWith(expected ? 'sk_live_' : 'sk_test_')
      && (process.env.STRIPE_WEBHOOK_READ_SECRET_KEY || '').startsWith(expected ? 'sk_live_' : 'sk_test_')
      && (process.env.STRIPE_WEBHOOK_SECRET || '').startsWith('whsec_'),
    );
    const catalogReady = Array.isArray(catalog)
      && catalog.length === EXPECTED_CATALOG.size
      && catalog.every((row) => EXPECTED_CATALOG.get(row.transition_key) === row.net_cents
        && row.currency === 'usd'
        && row.livemode === expected
        && row.active === true);
    const ready = !settingsError
      && !catalogError
      && productionReadiness.ready
      && settings?.checkout_enabled === true
      && settings.expected_livemode === expected
      && (!expected || settings.live_payment_approved === true)
      && Number.isFinite(verifiedAt)
      && verifiedAt >= Date.now() - 24 * 60 * 60 * 1000
      && catalogReady
      && secretsReady;
    return json({ ready }, ready ? 200 : 503);
  } catch (error) {
    return handleError(error);
  }
}
