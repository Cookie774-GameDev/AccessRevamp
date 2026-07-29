import { sandboxBadge } from './shell.js';
import { escapeHtml, icon } from './icons.js';
import { planValueGroups } from './plan-value-groups.js';

const compactArtifactMap = Object.freeze({
  free_snapshot: [['01', 'Finding'], ['01', 'Next step']],
  homepage_reveal: [['01', 'Report'], ['02', 'Screen exports'], ['01', 'Motion poster']],
  complete_revamp: [['05', 'Pages'], ['15', 'Campaign assets'], ['05', 'Brand pieces']],
  cinematic_scroll: [['05', 'Pages'], ['04', 'Story beats'], ['03', 'Fallback modes']],
});

const compactArtifacts = (plan) => `<div class="plan-artifacts" aria-label="${escapeHtml(plan.name)} deliverable overview">${compactArtifactMap[plan.key]
  .map(([count, label]) => `<span><b>${escapeHtml(count)}</b>${escapeHtml(label)}</span>`)
  .join('')}</div>`;

export function planCard(plan, { featured = false, compact = false } = {}) {
  const action = plan.key === 'free_snapshot'
    ? `<a class="button button--full" href="/contact?interest=free_snapshot" data-nav>Request ${escapeHtml(plan.name)} ${icon('arrow')}</a>`
    : `<button class="button button--full" type="button" data-checkout="${plan.key}">Choose ${escapeHtml(plan.name)} ${icon('arrow')}</button>`;
  return `<article data-plan-tier="${escapeHtml(plan.key)}" class="plan-card plan-card--${escapeHtml(plan.key)}${featured ? ' plan-card--featured' : ''}${compact ? ' plan-card--compact' : ''}">
    <div class="plan-card__top"><span class="kicker">${escapeHtml(plan.label)}</span>${featured ? '<span class="plan-flag">Most complete</span>' : ''}</div>
    <h3>${escapeHtml(plan.name)}</h3>
    <p>${escapeHtml(plan.summary)}</p>
    <div class="plan-price"><strong>${escapeHtml(plan.displayPrice)}</strong><span>one time</span></div>
    ${compact ? compactArtifacts(plan) : ''}
    ${planValueGroups(plan)}
    ${action}
    ${plan.key === 'free_snapshot' ? '' : sandboxBadge()}
  </article>`;
}

export function workCard(item, { featured = false } = {}) {
  return `<article class="work-card${featured ? ' work-card--featured' : ''}">
    <a class="work-card__art art-${item.slug}" href="/work/${item.slug}" data-nav aria-label="Open ${escapeHtml(item.title)} concept story"><span class="art-word">${escapeHtml(item.artWord)}</span><span class="art-index">${escapeHtml(item.index)}</span></a>
    <div class="work-card__meta"><div><span>${escapeHtml(item.category)}</span><h3><a href="/work/${item.slug}" data-nav>${escapeHtml(item.title)}</a></h3></div><a class="circle-link" href="/work/${item.slug}" data-nav aria-label="View ${escapeHtml(item.title)}">${icon('arrow')}</a></div>
    <p>${escapeHtml(item.summary)}</p>
    <span class="concept-label">Fictional concept · Original work</span>
  </article>`;
}
