import { getSupabase } from '../lib/supabase.js';
import { persistDraftThenCreateCheckout } from './persisted-checkout.js';

const PENDING_PLAN_KEY = 'accessrevamp:pending-plan';
const PAID_PLANS = new Set(['homepage_reveal', 'complete_revamp', 'cinematic_scroll']);

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

    let requestId = form.dataset.orderRequestId;
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
      const checkout = await persistDraftThenCreateCheckout({
        draftBody,
        targetTier,
        requestId,
        accessToken: session.access_token,
      });

      if (checkout.requestId !== requestId) {
        requestId = checkout.requestId;
        form.dataset.orderRequestId = requestId;
        form.dispatchEvent(new CustomEvent('order-request-id-rotated', {
          bubbles: false,
          detail: { requestId },
        }));
      }

      control.textContent = 'Opening secure Stripe checkout…';
      location.assign(checkout.url);
    } catch (error) {
      setCheckoutFailure(control, error?.message || 'Checkout unavailable — try again');
      return;
    } finally {
      if (document.contains(control)
        && !['Sign in to continue', 'Complete the project request', 'Reload and try again'].includes(control.textContent)
        && !control.textContent.includes('saved')
        && !control.textContent.includes('unavailable')
        && !control.textContent.includes('ended')) {
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
