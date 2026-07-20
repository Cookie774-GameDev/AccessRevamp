import { getSupabase } from '../lib/supabase.js';

const SESSION_PATTERN = /^cs_(test|live)_[A-Za-z0-9_]+$/;
const STORAGE_KEY = 'accessrevamp-order-draft-v1';
const RETRY_DELAYS_MS = [0, 1200, 2500, 4500];

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function setupCheckoutResult(root = document) {
  const card = root.querySelector('[data-checkout-result]');
  if (!card) return undefined;
  const heading = card.querySelector('[data-checkout-result-heading]');
  const message = card.querySelector('[data-checkout-result-message]');
  const action = card.querySelector('[data-checkout-result-action]');
  const sessionId = new URLSearchParams(location.search).get('session_id') || '';
  let canceled = false;

  const render = ({ title, body, actionText = 'Open the workspace', actionHref = '/account/projects' }) => {
    if (canceled) return;
    heading.textContent = title;
    message.textContent = body;
    action.textContent = actionText;
    action.href = actionHref;
  };

  const verify = async () => {
    if (!SESSION_PATTERN.test(sessionId)) {
      render({
        title: 'No verified payment session was provided.',
        body: 'Do not submit another payment based on this page. Open your workspace or contact AccessRevamp with your Stripe receipt.',
      });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      render({
        title: 'Payment verification is temporarily unavailable.',
        body: 'Do not pay again. The signed Stripe webhook is the source of truth; use your Stripe receipt and contact AccessRevamp if the order does not appear.',
      });
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    const authSession = data?.session;
    if (error || !authSession?.access_token) {
      render({
        title: 'Sign in to verify this payment.',
        body: 'Use the confirmed email from Checkout. Do not pay again while verification is pending.',
        actionText: 'Sign in',
        actionHref: '/login',
      });
      return;
    }

    for (const delay of RETRY_DELAYS_MS) {
      if (delay) await wait(delay);
      if (canceled) return;
      try {
        const response = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`, {
          method: 'GET',
          headers: { authorization: `Bearer ${authSession.access_token}` },
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload.status === 'paid' && payload.projectId) {
          try { localStorage.removeItem(STORAGE_KEY); } catch { /* The durable server copy already exists. */ }
          render({
            title: 'Payment verified. Your project is ready.',
            body: 'The signed Stripe webhook created the order, entitlement, and project. Continue to your private workspace.',
          });
          return;
        }
        if (response.ok && ['refunded', 'partially_refunded', 'disputed'].includes(payload.status)) {
          render({
            title: 'Your payment record needs review.',
            body: 'The order exists, but its current payment state is not a normal paid state. Open the workspace or contact AccessRevamp. Do not pay again.',
          });
          return;
        }
        if (response.ok && ['expired', 'canceled', 'reversed'].includes(payload.status)) {
          render({
            title: 'No completed payment was recorded.',
            body: 'The Checkout attempt ended without a paid order. Your saved request can be used for a fresh attempt.',
            actionText: 'Return to your request',
            actionHref: '/#start-project',
          });
          return;
        }
        if (response.status === 401 || response.status === 403) {
          render({
            title: 'Sign in to verify this payment.',
            body: 'Use the confirmed email from Checkout. Do not pay again while verification is pending.',
            actionText: 'Sign in',
            actionHref: '/login',
          });
          return;
        }
        if (![200, 202, 404, 503].includes(response.status)) break;
      } catch {
        // A later bounded retry may succeed; never treat a network failure as payment failure.
      }
    }

    render({
      title: 'Payment confirmation is still processing.',
      body: 'Do not pay again. Stripe may already have accepted the payment while the signed webhook finishes the durable order record. Check the workspace or contact AccessRevamp with your receipt.',
    });
  };

  verify();
  return () => { canceled = true; };
}
