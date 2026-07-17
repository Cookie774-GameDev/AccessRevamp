const CHECKOUT_ENDPOINT = '/.netlify/functions/create-checkout';
const ALLOWED_STRIPE_HOSTS = new Set(['checkout.stripe.com', 'book.stripe.com']);
let checkoutInProgress = false;

function isPlainPrimaryClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function validatedStripeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED_STRIPE_HOSTS.has(url.hostname)) {
    throw new Error('Checkout returned an unexpected destination.');
  }
  return url.toString();
}

document.addEventListener('click', async (event) => {
  const link = event.target.closest?.('[data-checkout]');
  if (!link || !isPlainPrimaryClick(event)) return;

  event.preventDefault();
  if (checkoutInProgress) return;

  const planKey = link.dataset.checkout;
  const fallbackUrl = link.href;
  const originalText = link.textContent;
  checkoutInProgress = true;
  link.setAttribute('aria-busy', 'true');
  link.textContent = 'Opening secure checkout…';

  try {
    const response = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        planKey,
        requestId: crypto.randomUUID(),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout is temporarily unavailable.');
    window.location.assign(validatedStripeUrl(payload.url));
  } catch (error) {
    console.error('AccessRevamp server checkout failed; using configured Stripe fallback.', error);
    try {
      window.location.assign(validatedStripeUrl(fallbackUrl));
    } catch {
      link.textContent = 'Checkout unavailable';
      link.setAttribute('aria-label', 'Checkout is temporarily unavailable. Please contact AccessRevamp.');
      checkoutInProgress = false;
      link.removeAttribute('aria-busy');
      return;
    }
  } finally {
    if (document.contains(link)) {
      link.textContent = originalText;
      link.removeAttribute('aria-busy');
    }
    checkoutInProgress = false;
  }
});
