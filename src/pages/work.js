import { findPortfolioItem, portfolioItems } from '../data/portfolio.js';
import { workCard } from '../components/cards.js';
import { escapeHtml, icon } from '../components/icons.js';
import { shell } from '../components/shell.js';

export function workPage() {
  return shell(`<section class="page-hero"><div class="container-wide page-hero__split"><div><span class="eyebrow">Original concept portfolio</span><h1>Work with its own point of view.</h1></div><div class="page-hero__aside"><p class="lede">Seven fictional concepts across storefronts, campaigns, and a cinematic product story—created to show range without pretending to be commissioned work.</p></div></div></section><section class="section"><div class="container-wide"><div class="filter-row" aria-label="Portfolio categories"><button class="filter-chip" type="button" data-filter="all" aria-pressed="true">All work</button><button class="filter-chip" type="button" data-filter="homepage" aria-pressed="false">Homepages</button><button class="filter-chip" type="button" data-filter="campaign" aria-pressed="false">Campaigns</button><button class="filter-chip" type="button" data-filter="cinematic" aria-pressed="false">Cinematic</button></div><div class="work-grid" data-work-grid>${portfolioItems.map((item) => `<div data-work-kind="${item.kind}">${workCard(item)}</div>`).join('')}</div><div class="work-disclosure"><strong>Fictional by design</strong><span>These are original portfolio demonstrations, not client endorsements, unsolicited prospect redesigns, or claims of measured business outcomes.</span></div></div></section>`, { pathname: '/work' });
}

export function setupWorkFilters() {
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const items = [...document.querySelectorAll('[data-work-kind]')];
  if (!buttons.length) return undefined;
  const onClick = (event) => {
    const selected = event.currentTarget.dataset.filter;
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button === event.currentTarget)));
    items.forEach((item) => { item.hidden = selected !== 'all' && item.dataset.workKind !== selected; });
  };
  buttons.forEach((button) => button.addEventListener('click', onClick));
  return () => buttons.forEach((button) => button.removeEventListener('click', onClick));
}

export function workDetailPage({ slug }) {
  const item = findPortfolioItem(slug);
  if (!item) return null;
  return shell(`<section class="page-hero"><div class="container-wide"><a class="text-arrow" href="/work" data-nav>← All work</a><span class="eyebrow">${escapeHtml(item.category)}</span><h1>${escapeHtml(item.title)}</h1><p class="lede">${escapeHtml(item.summary)}</p></div></section><section class="project-hero"><div class="container-wide"><div class="work-card__art project-hero__art art-${item.slug}"><span class="art-word">${escapeHtml(item.artWord)}</span><span class="art-index">${escapeHtml(item.index)}</span></div><div class="project-intro"><dl class="project-facts"><div><dt>Type</dt><dd>${escapeHtml(item.deliverable)}</dd></div><div><dt>Palette</dt><dd>${escapeHtml(item.palette)}</dd></div><div><dt>Status</dt><dd>Original fictional concept</dd></div></dl><div class="project-copy"><span class="eyebrow">The design decision</span><h2>A concept shaped around the problem—not a preset style.</h2><h3>Challenge</h3><p>${escapeHtml(item.challenge)}</p><h3>Direction</h3><p>${escapeHtml(item.direction)}</p>${item.slug === 'aether-one' ? `<a class="button" href="/cinematic-scroll" data-nav>Open the scroll experience ${icon('arrow')}</a>` : `<a class="button" href="/pricing" data-nav>Build your direction ${icon('arrow')}</a>`}</div></div></div></section>`, { pathname: `/work/${slug}` });
}
