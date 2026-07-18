import { track } from './analytics.js';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TIERS = new Set(['free_snapshot', 'homepage_reveal', 'complete_revamp', 'cinematic_scroll']);

export function readPrivatePricingToken(locationValue = location) {
  const token = new URLSearchParams(String(locationValue.hash || '').replace(/^#/, '')).get('quote') || '';
  return TOKEN_PATTERN.test(token) ? token : token ? null : '';
}

function normalizeContext(value) {
  if (!value || typeof value !== 'object' || !TIERS.has(value.recommended_tier)) throw new Error('Invalid private context.');
  const website = new URL(String(value.website_url || ''));
  const expiry = new Date(value.expires_at);
  const label = String(value.customer_label || '').trim().slice(0, 120);
  const scope = String(value.scope_summary || '').trim().slice(0, 800);
  if (website.protocol !== 'https:' || !label || scope.length < 20 || Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
    throw new Error('Invalid private context.');
  }
  return { label, scope, website, expiry, tier: value.recommended_tier };
}

export function setupPricingContext(root = document) {
  const host = root.querySelector('[data-private-pricing-context]');
  if (!host) return undefined;
  const token = readPrivatePricingToken();
  if (String(location.hash || '').includes('quote=')) history.replaceState(history.state, '', `${location.pathname}${location.search}`);
  if (token === '') return undefined;

  let active = true;
  const title = host.querySelector('[data-private-customer]');
  const scope = host.querySelector('[data-private-scope]');
  const details = host.querySelector('[data-private-details]');
  const showFailure = () => {
    host.hidden = false;
    host.dataset.state = 'unavailable';
    title.textContent = 'Private context unavailable';
    scope.textContent = 'The standard one-time prices remain available below.';
    details.hidden = true;
  };
  if (token === null) { showFailure(); return undefined; }

  fetch('/.netlify/functions/pricing-context', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Private pricing context is unavailable.');
    return normalizeContext(body.context);
  }).then((context) => {
    if (!active) return;
    host.hidden = false;
    host.dataset.state = 'ready';
    title.textContent = `Prepared for ${context.label}`;
    scope.textContent = context.scope;
    const link = host.querySelector('[data-private-website]');
    link.href = context.website.href;
    link.textContent = context.website.hostname.replace(/^www\./, '');
    host.querySelector('[data-private-expiry]').textContent = context.expiry.toLocaleDateString(undefined, { dateStyle: 'medium' });
    details.hidden = false;
    const card = root.querySelector(`[data-plan-tier="${context.tier}"]`);
    if (card) {
      card.classList.add('plan-card--private-recommended');
      card.setAttribute('aria-label', `${card.querySelector('h3')?.textContent || 'Plan'} — recommended for this private context`);
      const flag = document.createElement('span');
      flag.className = 'plan-flag plan-flag--private';
      flag.textContent = 'Recommended for you';
      card.querySelector('.plan-card__top')?.append(flag);
    }
    track('private_pricing_opened', { status: 'ready', tier: context.tier });
  }).catch(() => {
    if (!active) return;
    showFailure();
    track('private_pricing_opened', { status: 'unavailable' });
  });
  return () => { active = false; };
}
