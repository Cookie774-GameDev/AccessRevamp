import { getSupabase } from '../lib/supabase.js';

const CHECKOUT_ENDPOINT = '/.netlify/functions/create-checkout';
const ALLOWED_STRIPE_HOSTS = new Set(['checkout.stripe.com']);

function validatedStripeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:'
    || !ALLOWED_STRIPE_HOSTS.has(url.hostname)
    || url.username
    || url.password) {
    throw new Error('Checkout returned an unexpected destination.');
  }
  return url.toString();
}

function setCheckoutFailure(control, message) {
  control.textContent = message;
  control.setAttribute('aria-label', message);
}

export function setupCheckout() {
  let checkoutInProgress = false;
  const requestIds = new Map();
  const onClick = async (event) => {
    const control = event.target.closest?.('[data-checkout]');
    const modified = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!control || modified) return;
    event.preventDefault();
    if (checkoutInProgress) return;

    const originalHtml = control.innerHTML;
    checkoutInProgress = true;
    control.setAttribute('aria-busy', 'true');
    control.setAttribute('disabled', '');
    control.textContent = 'Verifying your upgrade…';

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Account checkout is not configured.');
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;
      if (error || !session?.access_token) {
        setCheckoutFailure(control, 'Sign in to continue');
        return;
      }

      const response = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetTier: control.dataset.checkout,
          requestId: (() => {
            const existing = requestIds.get(control.dataset.checkout);
            if (existing) return existing;
            const created = crypto.randomUUID();
            requestIds.set(control.dataset.checkout, created);
            return created;
          })(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || Object.keys(payload).length !== 1 || !payload.url) {
        throw new Error('Checkout is temporarily unavailable.');
      }
      location.assign(validatedStripeUrl(payload.url));
    } catch {
      setCheckoutFailure(control, 'Checkout unavailable — try again');
      return;
    } finally {
      if (document.contains(control)
        && !['Sign in to continue', 'Checkout unavailable — try again'].includes(control.textContent)) {
        control.innerHTML = originalHtml;
      }
      control.removeAttribute('aria-busy');
      control.removeAttribute('disabled');
      checkoutInProgress = false;
    }
  };

  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
