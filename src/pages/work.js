import { icon } from '../components/icons.js';
import { showcaseChapter } from '../components/showcase-chapter.js';
import { shell } from '../components/shell.js';
import { portfolioItems } from '../data/portfolio.js';
import { showcasePairs } from '../data/showcase-media.js';

const filmCard = (item) => `<article class="portfolio-film-card portfolio-film-card--${item.slug}">
  <a class="portfolio-film-card__media" href="${item.href}" aria-label="Open ${item.title} scroll experience">
    <img src="${item.poster}" alt="${item.title} opening scene" width="1920" height="1080" loading="eager" decoding="async">
    <span class="portfolio-film-card__veil" aria-hidden="true"></span>
    <span class="portfolio-film-card__index">${item.index}</span>
    <span class="portfolio-film-card__open">Open scroll experience ${icon('arrow')}</span>
  </a>
  <header class="portfolio-film-card__header">
    <div><span class="eyebrow">${item.eyebrow}</span><h2>${item.title}</h2></div>
    <p>${item.summary}</p>
  </header>
  <ul aria-label="${item.title} features">${item.meta.map((entry) => `<li>${entry}</li>`).join('')}</ul>
</article>`;

export function workPage() {
  return shell(`
    <section class="working-portfolio-hero">
      <div class="container-wide working-portfolio-hero__grid">
        <div><span class="eyebrow">Working experience portfolio</span><h1>Websites you can actually enter.</h1></div>
        <div><p class="lede">Five original demonstrations built to move with the visitor—not static mockups and not unrelated filler.</p><div class="work-disclosure"><strong>Original demonstrations</strong><span>These are AccessRevamp-built portfolio experiences, not client endorsements or measured outcome claims.</span></div></div>
      </div>
    </section>
    <section class="section working-portfolio-films" aria-labelledby="scroll-films-title">
      <div class="container-wide">
        <div class="chapter-head"><span class="chapter-index">Full-screen stories</span><div><h2 id="scroll-films-title">Cinematic scroll films</h2><p>Open either experience, then scroll down to advance or back up to reverse the film.</p></div></div>
        <div class="portfolio-film-grid">${portfolioItems.map(filmCard).join('')}</div>
      </div>
    </section>
    <section class="showcase-section working-portfolio-comparisons" aria-labelledby="portfolio-comparisons-title">
      <div class="container-wide showcase-intro"><span class="eyebrow">Interactive website comparisons</span><h2 id="portfolio-comparisons-title">Three brands. Two production depths each.</h2><p>Each website pair is live below. Scroll, drag, or use the range control to compare the standard and cinematic directions.</p></div>
      ${showcasePairs.map(showcaseChapter).join('')}
    </section>
    <section class="working-portfolio-footer"><div class="container-wide"><span class="eyebrow">Build your own direction</span><h2>Start with one real goal.</h2><a class="button button--sun" href="/pricing" data-nav>View AccessRevamp plans ${icon('arrow')}</a></div></section>
  `, { pathname: '/portfolio', pageClass: 'working-portfolio-page' });
}

export function setupWorkFilters() {
  return undefined;
}

export function workDetailPage() {
  return null;
}
