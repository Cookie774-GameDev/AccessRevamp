import { getSupabase } from '../lib/supabase.js';

const CHECKOUT_ENDPOINT = '/api/create-checkout';
const ORDER_DRAFT_ENDPOINT = '/api/order-draft';
const PENDING_PLAN_KEY = 'accessrevamp:pending-plan';
const ALLOWED_STRIPE_HOSTS = new Set(['checkout.stripe.com']);
const PAID_PLANS = new Set(['homepage_reveal', 'complete_revamp', 'cinematic_scroll']);

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

function validRequestId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}

export function setupCheckout() {
  let checkoutInProgress = false;
  const onClick = async (event) => {
    const control = event.target.closest?.('[data-checkout]');
    const modified = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!control || modified) return;
    event.preventDefault();
    if (checkoutInProgress) return;

    const targetTier = control.dataset.checkout;
    if (!PAID_PLANS.has(targetTier)) {
      setCheckoutFailure(control, 'Choose a valid plan');
      return;
    }

    const form = control.closest('[data-order-wizard]') || document.querySelector('[data-order-wizard]');
    if (!form) {
      try { sessionStorage.setItem(PENDING_PLAN_KEY, targetTier); } catch { /* Navigation still works. */ }
      location.assign('/#start-project');
      return;
    }
    if (!form.reportValidity()) {
      setCheckoutFailure(control, 'Complete the project request');
      return;
    }

    const requestId = form.dataset.orderRequestId;
    if (!validRequestId(requestId)) {
      setCheckoutFailure(control, 'Reload and try again');
      return;
    }

    const originalHtml = control.innerHTML;
    checkoutInProgress = true;
    control.setAttribute('aria-busy', 'true');
    control.setAttribute('disabled', '');
    control.textContent = 'Saving your project request…';

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Account checkout is not configured.');
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;
      if (error || !session?.access_token) {
        setCheckoutFailure(control, 'Sign in to continue');
        return;
      }

      const draftBody = new FormData(form);
      draftBody.set('requestId', requestId);
      draftBody.set('orderPlan', targetTier);
      const draftResponse = await fetch(ORDER_DRAFT_ENDPOINT, {
        method: 'POST',
        headers: { authorization: `Bearer ${session.access_token}` },
        body: draftBody,
      });
      const draftPayload = await draftResponse.json().catch(() => ({}));
      if (!draftResponse.ok || !draftPayload.draftId) {
        throw new Error(draftResponse.status === 401 || draftResponse.status === 403
          ? 'Sign in with the confirmed project email'
          : 'Your project request was not saved — no payment started');
      }

      control.textContent = 'Opening secure Stripe checkout…';
      const response = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ targetTier, requestId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || Object.keys(payload).length !== 1 || !payload.url) {
        throw new Error(response.status === 503
          ? 'Secure checkout is paused — your request is saved'
          : 'Checkout is temporarily unavailable — your request is saved');
      }
      location.assign(validatedStripeUrl(payload.url));
    } catch (error) {
      setCheckoutFailure(control, error?.message || 'Checkout unavailable — try again');
      return;
    } finally {
      if (document.contains(control)
        && !['Sign in to continue', 'Complete the project request', 'Reload and try again'].includes(control.textContent)
        && !control.textContent.includes('saved')
        && !control.textContent.includes('unavailable')) {
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
