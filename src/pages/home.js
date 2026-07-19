import { plans } from '../config.js';
import { planCard } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';
import { demoBrands, picture, visualAssets } from '../data/visual-assets.js';
import { lenses } from '../data/lenses.js';
import { lensVisual } from '../components/lens-visuals.js';
import { cinematicReferences } from '../data/cinematic-references.js';

const processSteps = [
  ['01', 'Observe', 'Read the ordinary public experience and record possible friction.'],
  ['02', 'Verify', 'Separate what is visible from inference, preference, and unsupported claims.'],
  ['03', 'Prioritize', 'Agree on the visitor task and the change that matters first.'],
  ['04', 'Design', 'Build a clear direction around the approved content and business goal.'],
  ['05', 'Implement', 'Produce only the pages and creative work in the written scope.'],
  ['06', 'Retest', 'Check the rebuilt experience and document what still needs attention.'],
];

const demos = [
  { href: '/portfolio/verdant-cut', number: '01', name: 'Verdant Cut Co.', type: 'Local service editorial system', action: 'Build a service plan', art: 'greenline', asset: demoBrands.greenline.interface },
  { href: '/portfolio/ember-and-jar', number: '02', name: 'Ember & Jar', type: 'Tactile food commerce', action: 'Choose a heat level', art: 'firejar', asset: demoBrands.firejar.interface },
  { href: '/portfolio/clearline-plumbing', number: '03', name: 'Clearline Plumbing', type: 'Technical local-service journey', action: 'Choose the right repair path', art: 'clearflow', asset: demoBrands.clearflow.interface },
];

const outcomes = [
  ['Confusion', 'clarity', 'Competing messages and actions', 'One understandable offer, proof sequence, and next step', visualAssets.auditBefore, visualAssets.auditAfter],
  ['Browsing', 'confident action', 'Products or services with equal visual weight', 'A hierarchy that helps visitors compare and decide', visualAssets.firejarHero, visualAssets.firejarInterface],
  ['Disconnected tools', 'one growth system', 'Website, content, and follow-up planned separately', 'Pages and creative assets built around the same campaign goal', visualAssets.evidenceLayers, visualAssets.clearflowInterface],
];

const referenceStudy = (reference, index) => `<article class="reference-card reference-card--${reference.study}" data-reveal>
  <div class="reference-card__study" aria-hidden="true"><span></span><span></span><span></span><b>${String(index + 1).padStart(2, '0')}</b></div>
  <span class="micro-label">${reference.source} · interaction study</span>
  <h3>${reference.title}</h3>
  <p>${reference.technique}</p>
  <p class="reference-credit">Created by ${reference.creator}, not by AccessRevamp.</p>
  <a class="text-arrow" href="${reference.url}" target="_blank" rel="noopener noreferrer">Open original source ${icon('arrow')}</a>
</article>`;

const lensTile = (lens, index) => {
  const number = String(index + 1).padStart(2, '0');
  const id = `lens-detail-${index + 1}`;
  return `<button class="lens-tile lens-tile--${lens.tone}" type="button" data-lens aria-expanded="false" aria-controls="${id}">
    <span class="lens-tile__top"><b>${number}</b><span>Explore <i aria-hidden="true">+</i></span></span>
    <span class="lens-tile__visual" data-lens-visual="${lens.visual}">${lensVisual(lens.visual)}</span>
    <span class="lens-tile__summary"><strong>${lens.title}</strong><span>${lens.summary}</span></span>
    <span class="lens-tile__detail" id="${id}"><span>We inspect this lens against the primary visitor task and record observable evidence before recommending a change.</span><b>What we check</b><span class="lens-tile__checks">${lens.checks.map((check) => `<i>${check}</i>`).join('')}</span><b>Practical direction</b><span>${lens.outcome}</span></span>
  </button>`;
};

const demoCard = (demo) => `<article class="demo-card demo-card--${demo.art}" data-reveal>
  <a class="demo-card__visual" href="${demo.href}" data-nav aria-label="Open ${demo.name} portfolio concept">
    <span class="demo-card__image">${picture(demo.asset, { alt: `${demo.name} responsive fictional website concept`, sizes: '(max-width: 760px) 100vw, 55vw' })}</span>
    <span class="demo-card__number">${demo.number}</span><span class="demo-card__action">${demo.action} ${icon('arrow')}</span>
  </a>
  <div class="demo-card__copy"><span class="micro-label">${demo.type}</span><h3><a href="${demo.href}" data-nav>${demo.name}</a></h3><p>Original working demo — not a client engagement.</p></div>
</article>`;

const transformationPanel = ([from, to, problem, change, before, after], index) => `<article class="transformation-panel" data-reveal>
  <div class="transformation-panel__media">
    <span class="transformation-panel__before">${picture(before, { alt: `${from} interface state`, sizes: '(max-width: 760px) 100vw, 30vw' })}</span>
    <span class="transformation-panel__after">${picture(after, { alt: `${to} interface direction`, sizes: '(max-width: 760px) 100vw, 30vw' })}</span>
    <span class="transformation-panel__line" aria-hidden="true"></span>
  </div>
  <span class="micro-label">Transformation ${String(index + 1).padStart(2, '0')}</span>
  <h3>${from} <em>→ ${to}</em></h3>
  <dl><div><dt>Before</dt><dd>${problem}</dd></div><div><dt>Direction</dt><dd>${change}</dd></div></dl>
</article>`;

const faq = (question, answer) => `<details><summary>${question}<span aria-hidden="true">+</span></summary><p>${answer}</p></details>`;

export function homePage() {
  const pricing = Object.values(plans).map((plan) => planCard(plan, { featured: plan.key === 'complete_revamp', compact: true })).join('');
  const process = processSteps.map(([number, title, copy]) => `<li><span>${number}</span><strong>${title}</strong><p>${copy}</p></li>`).join('');

  return shell(`
    <section class="reveal-hero" data-reveal-hero aria-label="AccessRevamp transforms an unfinished storefront into a refined growth system">
      <h1 class="visually-hidden">AccessRevamp transforms storefronts, websites, and customer journeys.</h1>
      <svg class="reveal-hero__grid" data-reveal-grid aria-hidden="true"><defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="#64748b" stroke-width="0.6"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/></svg>
      <picture class="reveal-hero__layer reveal-hero__base">
        <source media="(max-width: 700px)" srcset="/images/hero/accessrevamp-atlas-base-mobile.webp">
        <img src="/images/hero/accessrevamp-atlas-base-desktop.webp" alt="Pale sculptural AccessRevamp scene showing a website, marketing, commerce, and customer journey system carried by Atlas" width="1672" height="941" fetchpriority="high" decoding="async">
      </picture>
      <picture class="reveal-hero__layer reveal-hero__gold" data-reveal-gold aria-hidden="true">
        <source media="(max-width: 700px)" srcset="/images/hero/accessrevamp-atlas-gold-mobile.webp">
        <img src="/images/hero/accessrevamp-atlas-gold-desktop.webp" alt="" width="1672" height="941" decoding="async">
      </picture>
      <span class="reveal-cursor" data-reveal-cursor aria-hidden="true"><i></i></span>
      <div class="reveal-hero__cue"><span>Move or drag to reveal</span><button type="button" data-reveal-toggle aria-pressed="false">Reveal transformation</button></div>
      <a class="reveal-hero__scroll" href="#promise">Scroll to enter <span aria-hidden="true">↓</span></a>
    </section>

    <section class="renaissance-promise" id="promise"><div class="container-wide promise-grid">
      <div><span class="eyebrow">One clearer growth system</span><h2>A better storefront is more than a better-looking homepage.</h2></div>
      <p class="promise-lede">AccessRevamp improves the message, customer path, mobile experience, creative material, and next action as one connected design problem.</p>
      <div class="promise-outcomes"><article><b>01</b><h3>Understand</h3><p>Make the offer immediately recognizable.</p></article><article><b>02</b><h3>Act</h3><p>Make the next useful step easier to complete.</p></article><article><b>03</b><h3>Connect</h3><p>Give the website and marketing work one direction.</p></article></div>
    </div></section>

    <section class="section transformation-section"><div class="container-wide"><div class="chapter-head" data-reveal><span class="chapter-index">Transformation studies</span><div><h2>Potential becomes visible when the hierarchy changes.</h2><p>These are original illustrative interfaces. The design reasoning is real; the business outcome still depends on the customer’s offer, traffic, market, and operations.</p></div></div><div class="transformation-grid">${outcomes.map(transformationPanel).join('')}</div></div></section>

    <section class="section services-renaissance"><div class="container-wide"><div class="section-head"><div><span class="eyebrow">Four one-time depths</span><h2>Choose the transformation you need.</h2></div><p>The $50 purchase is never wasted: verified, settled value becomes credit toward $200 or $250.</p></div><div class="upgrade-ribbon" aria-label="Cumulative upgrade credit"><strong>Keep every verified dollar</strong><span>$50 → $200 <b>pay $150</b></span><span>$50 → $250 <b>pay $200</b></span><span>$200 → $250 <b>pay only $50</b></span></div><div class="pricing-grid">${pricing}</div><a class="text-arrow section-link" href="/pricing" data-nav>Compare every deliverable ${icon('arrow')}</a></div></section>

    <section class="section demo-section"><div class="container-wide"><div class="chapter-head" data-reveal><span class="chapter-index">Original portfolio worlds</span><div><h2>Three industries. Three completely different design systems.</h2><p>Each concept is an original responsive mini-application with its own grid, typography, image treatment, motion, and conversion path.</p></div></div><div class="demo-showcase">${demos.map(demoCard).join('')}</div></div></section>

    <section class="section reference-section"><div class="container-wide"><div class="chapter-head chapter-head--light" data-reveal><span class="chapter-index">Interaction references</span><div><h2>Experiences that inspire our standard.</h2><p>These external examples are credited references—not AccessRevamp work. The moving studies below demonstrate techniques in an original, lightweight form without copying protected media or code.</p></div></div><div class="reference-grid">${cinematicReferences.map(referenceStudy).join('')}</div></div></section>

    <section class="section spectrum-section"><div class="container-wide"><div class="chapter-head" data-reveal><span class="chapter-index">Eleven review lenses</span><div><h2>One system, inspected from every useful angle.</h2><p>Open a lens to see what we check and the practical direction it can create.</p></div></div><div class="lens-mosaic" data-lens-grid>${lenses.map(lensTile).join('')}</div></div></section>

    <section class="section process-map-section"><div class="container-wide process-story"><div class="process-story__intro"><span class="eyebrow">A visible method</span><h2>From observation to an agreed build.</h2><p>Each stage earns the next. Recommendations remain separate from claims, and implementation stays inside the purchased scope.</p><a class="text-arrow" href="/process" data-nav>Read the complete process ${icon('arrow')}</a></div><div class="process-story__rail"><ol class="process-map">${process}</ol></div></div></section>

    <section class="section creative-bundle-section"><div class="container-wide creative-bundle"><div><span class="eyebrow">Creative production included</span><h2>Your rebuilt website arrives with material to promote it.</h2><p>The $50 Homepage Reveal includes one subtle AI-assisted motion poster. The $200 Complete Website Revamp includes five motion posters, ten still posters, three business-card directions, and two brochure directions—all human-reviewed and based on customer-approved assets and claims.</p><a class="button" href="/pricing" data-nav>See the complete plan details ${icon('arrow')}</a></div><div class="creative-orbit" aria-label="Illustrative creative deliverable formats"><span>Motion<br>9:16</span><span>Still<br>1:1</span><span>Card<br>front/back</span><span>Brochure<br>two directions</span><i aria-hidden="true"></i></div></div></section>

    <section class="section faq-section"><div class="container-wide faq-layout"><div><span class="eyebrow">Straight answers</span><h2>Clear scope before checkout.</h2></div><div class="faq-list">${faq('What happens if I buy the $50 plan first?', 'The verified $50 purchase is credited toward a higher tier. Upgrade to the $200 plan for $150, or to the $250 plan for $200.')}${faq('Does the $250 plan include the $200 intake?', 'Yes. It includes the Complete Website Revamp scope, the same page and style brief, plus the cinematic sequence. A verified $200 customer upgrades for $50.')}${faq('Can I share designs I like?', 'Yes. Complete and Cinematic customers can choose page types, describe the style, upload reference images from a phone, and share website links. References guide the direction; AccessRevamp does not copy another brand’s logo, copy, imagery, or exact layout.')}${faq('Are the portfolio businesses real clients?', 'No. Every portfolio brand is an original working demo—not a client engagement.')}</div></div></section>

    <section class="section final-cta-section"><div class="container-wide final-cta final-cta--renaissance"><div class="final-cta__image"><div class="audit-montage"><span>${picture(visualAssets.greenlineInterface, { alt: 'Verdant Cut interface preview', sizes: '(max-width: 760px) 76vw, 24vw' })}</span><span>${picture(visualAssets.firejarInterface, { alt: 'Ember and Jar interface preview', sizes: '(max-width: 760px) 70vw, 22vw' })}</span><span>${picture(visualAssets.clearflowInterface, { alt: 'Clearline interface preview', sizes: '(max-width: 760px) 65vw, 20vw' })}</span></div></div><div><span class="eyebrow">Make the potential visible</span><h2>Your storefront already has potential.</h2><p>Bring one public website, one real goal, and the references that feel right for your business.</p><div class="final-cta__actions"><a class="button button--sun" href="/pricing" data-nav>Start my Homepage Reveal ${icon('arrow')}</a><a class="text-arrow" href="/contact?interest=complete_revamp" data-nav>Talk about a complete revamp ${icon('arrow')}</a></div></div></div></section>
  `, { home: true, pathname: '/', pageClass: 'renaissance-home' });
}
