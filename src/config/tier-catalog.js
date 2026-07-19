/** @typedef {'free_snapshot' | 'homepage_reveal' | 'complete_revamp' | 'cinematic_scroll'} TierKey */

/**
 * @typedef {object} Tier
 * @property {TierKey} key
 * @property {number} rank
 * @property {string} name
 * @property {string} label
 * @property {string} summary
 * @property {number} listPriceCents
 * @property {string} displayPrice
 * @property {'USD'} currency
 * @property {'one-time'} cadence
 * @property {readonly string[]} features
 */

/**
 * @typedef {object} UpgradeQuote
 * @property {TierKey | null} fromTierKey
 * @property {TierKey} targetTierKey
 * @property {string} transitionKey
 * @property {number} listPriceCents
 * @property {number} verifiedCreditCents
 * @property {number} dueNowCents
 * @property {TierKey} resultingEntitlement
 */

const tier = (definition) => Object.freeze({
  ...definition,
  features: Object.freeze([...definition.features]),
});

export const TIER_KEYS = Object.freeze([
  'free_snapshot',
  'homepage_reveal',
  'complete_revamp',
  'cinematic_scroll',
]);

/** @type {Readonly<Record<TierKey, Tier>>} */
export const TIERS = Object.freeze({
  free_snapshot: tier({
    key: 'free_snapshot',
    rank: 0,
    name: 'Free Snapshot',
    label: 'A useful first look',
    summary: 'One manually reviewed, evidence-backed public observation with a practical next step.',
    listPriceCents: 0,
    displayPrice: '$0',
    currency: 'USD',
    cadence: 'one-time',
    features: ['One human-reviewed observation', 'Evidence and confidence context', 'One practical opportunity', 'No checkout required'],
  }),
  homepage_reveal: tier({
    key: 'homepage_reveal',
    rank: 1,
    name: 'Homepage Reveal',
    label: 'A focused first look',
    summary: 'A human-reviewed report and one complete landing-page direction for a clearer next step.',
    listPriceCents: 5000,
    displayPrice: '$50',
    currency: 'USD',
    cadence: 'one-time',
    features: ['Human-reviewed findings report', 'One landing-page direction', 'Desktop and mobile PNG exports', 'One subtle AI-assisted motion poster ad', '30-day growth plan', 'Upgrade to the $200 plan later for only $150'],
  }),
  complete_revamp: tier({
    key: 'complete_revamp',
    rank: 2,
    name: 'Complete Website Revamp',
    label: 'The complete practical rebuild',
    summary: 'The applicable reveal work plus an agreed responsive implementation of up to five standard pages.',
    listPriceCents: 20000,
    displayPrice: '$200',
    currency: 'USD',
    cadence: 'one-time',
    features: ['Every applicable $50 Homepage Reveal deliverable', 'Up to five agreed standard pages', 'Responsive accessibility and performance work', 'Five Canva-built AI-assisted motion poster ads', 'Ten still poster variations', 'Three business card variations', 'Two brochure variations', 'Before/after evidence and one retest summary', 'Upgrade to the $250 Cinematic plan later for only $50'],
  }),
  cinematic_scroll: tier({
    key: 'cinematic_scroll',
    rank: 3,
    name: 'Cinematic Scroll Site',
    label: 'A story with movement',
    summary: 'The complete revamp scope plus one bounded cinematic single-page narrative and accessible fallbacks.',
    listPriceCents: 25000,
    displayPrice: '$250',
    currency: 'USD',
    cadence: 'one-time',
    features: ['Everything in Complete Website Revamp', 'One motion-led narrative sequence', 'Up to four story beats', 'Mobile and reduced-motion fallbacks', 'Upgrade from the $200 plan for $50'],
    deliveryBusinessDays: 3,
    motionSequenceCount: 1,
    maximumStoryBeats: 4,
    revisionRounds: 1,
    mobileFallback: true,
    reducedMotionFallback: true,
  }),
});

/** @param {string} key @returns {Tier} */
export function getTier(key) {
  const result = TIERS[key];
  if (!result) throw new RangeError(`Unknown tier: ${key}`);
  return result;
}

function validatePaidCents(paidCents) {
  if (!Number.isSafeInteger(paidCents) || paidCents < 0) {
    throw new RangeError('Paid value must be a nonnegative integer number of cents.');
  }
  if (paidCents > TIERS.cinematic_scroll.listPriceCents) {
    throw new RangeError('Paid value cannot exceed 25000 cents.');
  }
}

/** @param {number} paidCents @returns {TierKey | null} */
function tierKeyForPaidValue(paidCents) {
  if (paidCents >= TIERS.cinematic_scroll.listPriceCents) return 'cinematic_scroll';
  if (paidCents >= TIERS.complete_revamp.listPriceCents) return 'complete_revamp';
  if (paidCents >= TIERS.homepage_reveal.listPriceCents) return 'homepage_reveal';
  return null;
}

/** @param {number} paidCents @param {TierKey} targetKey */
export function getEligibleCreditCents(paidCents, targetKey) {
  validatePaidCents(paidCents);
  const target = getTier(targetKey);
  const currentKey = tierKeyForPaidValue(paidCents);
  if (currentKey && getTier(currentKey).rank > target.rank) {
    throw new RangeError(`Cannot quote a downgrade from ${currentKey} to ${targetKey}.`);
  }
  return Math.min(paidCents, target.listPriceCents);
}

/** @param {number} paidCents @param {TierKey} targetKey @returns {UpgradeQuote} */
export function quoteUpgrade(paidCents, targetKey) {
  const target = getTier(targetKey);
  const fromTierKey = tierKeyForPaidValue(paidCents);
  const verifiedCreditCents = getEligibleCreditCents(paidCents, targetKey);
  return Object.freeze({
    fromTierKey,
    targetTierKey: targetKey,
    transitionKey: `${fromTierKey || 'none'}->${targetKey}`,
    listPriceCents: target.listPriceCents,
    verifiedCreditCents,
    dueNowCents: target.listPriceCents - verifiedCreditCents,
    resultingEntitlement: targetKey,
  });
}
