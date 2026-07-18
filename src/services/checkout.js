const CHECKOUT_ENDPOINT = '/.netlify/functions/create-checkout';
const ALLOWED_STRIPE_HOSTS = new Set(['checkout.stripe.com', 'book.stripe.com']);

function validatedStripeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED_STRIPE_HOSTS.has(url.hostname)) {
    throw new Error('Checkout returned an unexpected destination.');
  }
  return url.toString();
}

export function setupCheckout() {
  let checkoutInProgress = false;
  const onClick = async (event) => {
    const link = event.target.closest?.('[data-checkout]');
    const modified = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!link || modified) return;
    event.preventDefault();
    if (checkoutInProgress) return;

    const originalHtml = link.innerHTML;
    checkoutInProgress = true;
    link.setAttribute('aria-busy', 'true');
    link.textContent = 'Opening secure checkout…';
    try {
      const response = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planKey: link.dataset.checkout, requestId: crypto.randomUUID() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout is temporarily unavailable.');
      location.assign(validatedStripeUrl(payload.url));
    } catch (serverError) {
      console.error('Server checkout failed; validating the configured Stripe fallback.', serverError);
      try {
        location.assign(validatedStripeUrl(link.href));
      } catch {
        link.textContent = 'Checkout unavailable';
        link.setAttribute('aria-label', 'Checkout is temporarily unavailable. Contact AccessRevamp for help.');
        return;
      }
    } finally {
      if (document.contains(link) && link.textContent !== 'Checkout unavailable') link.innerHTML = originalHtml;
      link.removeAttribute('aria-busy');
      checkoutInProgress = false;
    }
  };

  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
