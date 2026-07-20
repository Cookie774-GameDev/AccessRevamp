import { assertMethod, handleError, json } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { expectedLivemode } from './_shared/payment-runtime.mjs';

export default async function paymentHealth(request) {
  try {
    assertMethod(request, 'GET');
    const admin = getSupabaseAdmin();
    const expected = expectedLivemode(process.env);
    const [{ data: settings, error: settingsError }, { data: catalog, error: catalogError }] = await Promise.all([
      admin.from('payment_runtime_settings')
        .select('checkout_enabled,expected_livemode,live_payment_approved,configuration_verified_at')
        .eq('singleton', true)
        .maybeSingle(),
      admin.from('stripe_price_catalog')
        .select('transition_key,net_cents,livemode,active')
        .eq('active', true)
        .eq('livemode', expected),
    ]);
    const verifiedAt = Date.parse(settings?.configuration_verified_at || '');
    const secretsReady = Boolean(
      (process.env.STRIPE_CHECKOUT_SECRET_KEY || '').startsWith(expected ? 'sk_live_' : 'sk_test_')
      && (process.env.STRIPE_WEBHOOK_READ_SECRET_KEY || '').startsWith(expected ? 'sk_live_' : 'sk_test_')
      && (process.env.STRIPE_WEBHOOK_SECRET || '').startsWith('whsec_'),
    );
    const ready = !settingsError
      && !catalogError
      && settings?.checkout_enabled === true
      && settings.expected_livemode === expected
      && (!expected || settings.live_payment_approved === true)
      && Number.isFinite(verifiedAt)
      && verifiedAt >= Date.now() - 24 * 60 * 60 * 1000
      && catalog?.length === 6
      && secretsReady;
    return json({ ready }, ready ? 200 : 503);
  } catch (error) {
    return handleError(error);
  }
}
