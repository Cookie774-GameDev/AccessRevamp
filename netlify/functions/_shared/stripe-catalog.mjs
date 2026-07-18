const PRICE_ENV_BY_TRANSITION = Object.freeze({
  'none->homepage_reveal': 'STRIPE_HOMEPAGE_REVEAL_FULL_PRICE_ID',
  'none->complete_revamp': 'STRIPE_COMPLETE_REVAMP_FULL_PRICE_ID',
  'none->cinematic_scroll': 'STRIPE_CINEMATIC_FULL_PRICE_ID',
  'homepage_reveal->complete_revamp': 'STRIPE_HOMEPAGE_TO_COMPLETE_PRICE_ID',
  'homepage_reveal->cinematic_scroll': 'STRIPE_HOMEPAGE_TO_CINEMATIC_PRICE_ID',
  'complete_revamp->cinematic_scroll': 'STRIPE_COMPLETE_TO_CINEMATIC_PRICE_ID',
});

export function getStripePriceForQuote(quote, env = process.env) {
  if (!quote || !Number.isSafeInteger(quote.dueNowCents) || quote.dueNowCents <= 0) {
    throw new RangeError('No Stripe payment is due for this quote.');
  }
  const environmentName = PRICE_ENV_BY_TRANSITION[quote.transitionKey];
  if (!environmentName) throw new RangeError(`Unsupported Stripe transition: ${quote.transitionKey}`);
  const priceId = String(env[environmentName] || '').trim();
  if (!/^price_[A-Za-z0-9_]+$/.test(priceId)) {
    throw new Error(`${environmentName} must contain a valid server-only Stripe Price ID.`);
  }
  return Object.freeze({ priceId, transitionKey: quote.transitionKey });
}
