import { plans } from '../config.js';
import { planCard } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';
import { picture, visualAssets } from '../data/visual-assets.js';
import { exampleWebsites, showcasePairs } from '../data/showcase-media.js';
import { orderWizard } from '../components/order-wizard.js';

// Interaction references remain credited in their data module; external studies are not by AccessRevamp.

const processSteps = [
  ['01', 'Observe', 'Read the ordinary public experience and record possible friction.'],
  ['02', 'Verify', 'Separate what is visible from inference, preference, and unsupported claims.'],
  ['03', 'Prioritize', 'Agree on the visitor task and the change that matters first.'],
  ['04', 'Design', 'Build a clear direction around the approved content and business goal.'],
  ['05', 'Implement', 'Produce only the pages and creative work in the written scope.'],
  ['06', 'Retest', 'Check the rebuilt experience and document what still needs attention.'],
];

const outcomes = [
  ['Confusion', 'clarity', 'Competing messages and actions', 'One understandable offer, proof sequence, and next step', visualAssets.auditBefore, visualAssets.auditAfter],
  ['Browsing', 'confident action', 'Products or services with equal visual weight', 'A hierarchy that helps visitors compare and decide', visualAssets.firejarHero, visualAssets.firejarInterface],
  ['Disconnected tools', 'one growth system', 'Website, content, and follow-up planned separately', 'Pages and creative assets built around the same campaign goal', visualAssets.evidenceLayers, visualAssets.clearflowInterface],
];

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

const exampleWebsite = (example) => `<figure class="example-website" data-reveal><img src="${example.src}" alt="${example.alt}" width="${example.width}" height="${example.height}" loading="lazy" decoding="async" draggable="false"></figure>`;

const showcasePanel = (kind, src, poster, name) => `<figure class="showcase-panel"><figcaption>${kind === 'normal' ? 'Normal Website' : 'Cinematic Scroll Website'}</figcaption><div class="showcase-panel__media"><video data-src="${src}" poster="${poster}" muted playsinline preload="none" disablepictureinpicture controlslist="nodownload noplaybackrate nofullscreen" draggable="false" aria-label="${name} ${kind === 'normal' ? 'normal website' : 'cinematic scroll website'} demonstration"></video><span class="showcase-panel__fallback">Media unavailable. The poster frame preserves the visual comparison.</span></div></figure>`;

const showcaseChapter = (pair, index) => `<article class="showcase-chapter" data-showcase-chapter data-progress="0"><div class="showcase-chapter__sticky" data-showcase-stage tabindex="0" aria-label="Scroll or drag to compare ${pair.name}"><div class="showcase-chapter__head"><span>0${index + 1}</span><h3>${pair.name}</h3><p>Original working demo — not a client engagement.</p></div><div class="showcase-pair">${showcasePanel('normal', pair.normal, pair.normalPoster, pair.name)}${showcasePanel('cinematic', pair.cinematic, pair.cinematicPoster, pair.name)}</div><div class="showcase-controls"><span>Scroll or drag to explore</span><label><span class="visually-hidden">${pair.name} comparison progress</span><input type="range" min="0" max="100" value="0" step="1" data-showcase-range><output data-showcase-output>0%</output></label></div></div></article>`;

export function homePage() {
  const pricing = Object.values(plans).map((plan) => planCard(plan, { featured: plan.key === 'complete_revamp', compact: true })).join('');
  const process = processSteps.map(([number, title, copy]) => `<li><span>${number}</span><strong>${title}</strong><p>${copy}</p></li>`).join('');

  return shell(`
    <section class="reveal-hero" data-reveal-hero aria-label="AccessRevamp transforms an unfinished storefront into a refined growth system">
      <h1 class="visually-hidden">AccessRevamp transforms storefronts, websites, and customer journeys.</h1>
      <svg class="reveal-hero__grid" data-reveal-grid aria-hidden="true"><defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="#64748b" stroke-width="0.6"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/></svg>
      <picture class="reveal-hero__layer reveal-hero__base">
        <source media="(max-width: 700px)" srcset="/images/hero/accessrevamp-atlas-base-mobile.webp">
        <img src="/images/hero/accessrevamp-atlas-base-desktop.webp" alt="Pale sculptural AccessRevamp scene showing a website, marketing, commerce, and customer journey system carried by Atlas" width="1672" height="941" fetchpriority="high" decoding="async" draggable="false">
      </picture>
      <picture class="reveal-hero__layer reveal-hero__gold" data-reveal-gold aria-hidden="true">
        <source media="(max-width: 700px)" srcset="/images/hero/accessrevamp-atlas-gold-mobile.webp">
        <img src="/images/hero/accessrevamp-atlas-gold-desktop.webp" alt="" width="1672" height="941" decoding="async" draggable="false">
      </picture>
      <span class="reveal-cursor" data-reveal-cursor aria-hidden="true"><i></i></span>
      <div class="reveal-hero__cue"><span>Move or drag to reveal</span><button type="button" data-reveal-toggle aria-pressed="false">Reveal transformation</button></div>
      <a class="reveal-hero__scroll" href="#promise">Scroll to enter <span aria-hidden="true">↓</span></a>
    </section>

    <section class="trust-strip" aria-label="AccessRevamp service indicators"><div class="container-wide trust-strip__grid"><article><strong><span data-customer-count>87</span></strong><p>happy customers</p><small>Published count, not a live feed.</small></article><article><strong>3 days</strong><p>first website delivery</p><small>After payment and receipt of required assets.</small></article><article><strong>Desktop → mobile</strong><p>one connected system</p><small>Carefully ported to touch.</small></article></div></section>

    <section class="renaissance-promise" id="promise"><div class="container-wide promise-grid">
      <div><span class="eyebrow">A guided customer journey</span><h2>Your website should feel like a clear conversation—not a maze.</h2></div>
      <p class="promise-lede">AccessRevamp rebuilds the message, page order, mobile experience, and launch material together so every screen answers the next question and leads to one useful action.</p>
      <div class="promise-outcomes"><article><b>01</b><h3>Explain</h3><p>Show what you offer, who it is for, and why it matters.</p></article><article><b>02</b><h3>Guide</h3><p>Arrange proof, pages, and calls to action in the order visitors need them.</p></article><article><b>03</b><h3>Launch</h3><p>Deliver the finished site with approved creative material ready to promote.</p></article></div>
    </div></section>

    <section class="section example-websites-section"><div class="container-wide"><div class="chapter-head" data-reveal><span class="chapter-index">Selected concept directions</span><div><h2>Example Websites</h2><p>Complete homepage compositions shown without cropping or simulated browser controls.</p></div></div><div class="example-websites-grid">${exampleWebsites.map(exampleWebsite).join('')}</div><p class="concept-disclosure">Original working demo — not a client engagement.</p></div></section>

    <section class="showcase-section" aria-labelledby="showcase-title"><div class="container-wide showcase-intro"><span class="eyebrow">Two production depths</span><h2 id="showcase-title">Normal Websites vs. Cinematic Scroll Experiences</h2><p>Scroll down to advance and up to reverse. Each pair shares one progress value.</p></div>${showcasePairs.map(showcaseChapter).join('')}</section>

    <section class="section process-map-section"><div class="container-wide process-story"><div class="process-story__intro"><span class="eyebrow">A visible method</span><h2>From observation to an agreed build.</h2><p>Each stage earns the next. Recommendations remain separate from claims, and implementation stays inside the purchased scope.</p><a class="text-arrow" href="/process" data-nav>Read the complete process ${icon('arrow')}</a></div><div class="process-story__rail"><ol class="process-map">${process}</ol></div></div></section>

    <section class="section transformation-section"><div class="container-wide"><div class="chapter-head" data-reveal><span class="chapter-index">Transformation studies</span><div><h2>Potential becomes visible when the hierarchy changes.</h2><p>These are original illustrative interfaces. The design reasoning is real; the business outcome still depends on the customer’s offer, traffic, market, and operations.</p></div></div><div class="transformation-grid">${outcomes.map(transformationPanel).join('')}</div></div></section>

    <section class="section services-renaissance"><div class="container-wide"><div class="section-head"><div><span class="eyebrow">Four one-time depths</span><h2>Choose the transformation you need.</h2></div><p>The $50 purchase is never wasted: verified, settled value becomes credit toward $200 or $250.</p></div><div class="upgrade-ribbon" aria-label="Cumulative upgrade credit"><strong>Keep every verified dollar</strong><span>$50 → $200 <b>pay $150</b></span><span>$50 → $250 <b>pay $200</b></span><span>$200 → $250 <b>pay only $50</b></span></div><div class="pricing-grid">${pricing}</div><a class="text-arrow section-link" href="/pricing" data-nav>Compare every deliverable ${icon('arrow')}</a></div></section>

    ${orderWizard()}

    <section class="section faq-section"><div class="container-wide faq-layout"><div><span class="eyebrow">Straight answers</span><h2>Clear scope before checkout.</h2></div><div class="faq-list">${faq('What happens if I buy the $50 plan first?', 'The verified $50 purchase is credited toward a higher tier. Upgrade to the $200 plan for $150, or to the $250 plan for $200.')}${faq('Does the $250 plan include the $200 intake?', 'Yes. It includes the Complete Website Revamp scope, the same page and style brief, plus the cinematic sequence. A verified $200 customer upgrades for $50.')}${faq('Can I share designs I like?', 'Yes. Complete and Cinematic customers can choose page types, describe the style, upload reference images from a phone, and share website links. References guide the direction; AccessRevamp does not copy another brand’s logo, copy, imagery, or exact layout.')}${faq('Are the portfolio businesses real clients?', 'No. Every portfolio brand is an original working demo—not a client engagement.')}</div></div></section>

    <section class="section final-cta-section"><div class="container-wide final-cta final-cta--renaissance"><div class="final-cta__image"><div class="audit-montage"><span>${picture(visualAssets.greenlineInterface, { alt: 'Verdant Cut interface preview', sizes: '(max-width: 760px) 76vw, 24vw' })}</span><span>${picture(visualAssets.firejarInterface, { alt: 'Ember and Jar interface preview', sizes: '(max-width: 760px) 70vw, 22vw' })}</span><span>${picture(visualAssets.clearflowInterface, { alt: 'Clearline interface preview', sizes: '(max-width: 760px) 65vw, 20vw' })}</span></div></div><div><span class="eyebrow">Make the potential visible</span><h2>Your storefront already has potential.</h2><p>Bring one public website, one real goal, and the references that feel right for your business.</p><div class="final-cta__actions"><a class="button button--sun" href="/pricing" data-nav>Start my Homepage Reveal ${icon('arrow')}</a><a class="text-arrow" href="/contact?interest=complete_revamp" data-nav>Talk about a complete revamp ${icon('arrow')}</a></div></div></div></section>
  `, { home: true, pathname: '/', pageClass: 'renaissance-home' });
}
