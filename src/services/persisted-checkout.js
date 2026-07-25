const CHECKOUT_ENDPOINT = '/api/create-checkout';
const ORDER_DRAFT_ENDPOINT = '/api/order-draft';
const ALLOWED_STRIPE_HOSTS = new Set(['checkout.stripe.com']);

const validRequestId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');

function validatedStripeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED_STRIPE_HOSTS.has(url.hostname) || url.username || url.password) {
    throw new Error('Checkout returned an unexpected destination.');
  }
  return url.toString();
}

export async function persistDraftThenCreateCheckout({
  draftBody,
  targetTier,
  requestId,
  accessToken,
  fetchImpl = fetch,
}) {
  const draftResponse = await fetchImpl(ORDER_DRAFT_ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: draftBody,
  });
  const draftPayload = await draftResponse.json().catch(() => ({}));
  if (!draftResponse.ok || !draftPayload.draftId || !validRequestId(draftPayload.requestId)) {
    const safeDraftError = draftResponse.status >= 400 && draftResponse.status < 500
      && typeof draftPayload.error === 'string'
      && draftPayload.error.length <= 240
      ? draftPayload.error
      : '';
    throw new Error(safeDraftError || (draftResponse.status === 401 || draftResponse.status === 403
      ? 'Sign in with the confirmed project email'
      : draftResponse.status === 409
        ? (draftPayload.error || 'This saved request cannot start another payment')
        : 'Your project request was not saved — no payment started'));
  }

  const persistedRequestId = draftPayload.requestId;
  const checkoutResponse = await fetchImpl(CHECKOUT_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ targetTier, requestId: persistedRequestId }),
  });
  const checkoutPayload = await checkoutResponse.json().catch(() => ({}));
  if (!checkoutResponse.ok || Object.keys(checkoutPayload).length !== 1 || !checkoutPayload.url) {
    throw new Error(checkoutResponse.status === 503
      ? 'Secure checkout is paused — your request is saved'
      : checkoutResponse.status === 409
        ? 'The previous Checkout attempt ended — click once more to safely start a fresh attempt'
        : 'Checkout is temporarily unavailable — your request is saved');
  }

  return {
    requestId: persistedRequestId,
    url: validatedStripeUrl(checkoutPayload.url),
  };
}
