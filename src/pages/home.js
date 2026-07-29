import { plans } from '../config.js';
import { planCard } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';
import { picture, visualAssets } from '../data/visual-assets.js';
import { exampleWebsites, showcasePairs } from '../data/showcase-media.js';
import { orderWizard } from '../components/order-wizard.js';
import { showcaseChapter } from '../components/showcase-chapter.js';

// Interaction references remain credited in their data module; external studies are not by AccessRevamp.

const processSteps = [
  ['01', 'Review your current site', 'We look through the public website and note where visitors may get confused.'],
  ['02', 'Agree on the goal', 'We confirm what the website should help customers understand or do.'],
  ['03', 'Choose the right plan', 'You select the strategy, design, creative work, and implementation you need.'],
  ['04', 'Pick your direction', 'You review the concepts, rank your favorites, and share special instructions.'],
  ['05', 'Build and test', 'We create the agreed pages, check mobile and desktop, and correct visible problems.'],
  ['06', 'Receive and launch', 'Your approved website and launch materials arrive in your private workspace, ready to publish.'],
];

const customerJourney = [
  ['01', 'Tell us what you need', 'Share your current website, business goal, preferred direction, and useful references.', 'Brief', 'A clear written brief tied to the right business goal.'],
  ['02', 'Choose the right depth and direction', 'Select the service, complete secure checkout, then rank your visual directions in the private workspace.', 'Direction', 'A protected project, concepts to compare, and one agreed direction.'],
  ['03', 'Review, receive, and launch', 'Follow progress, review the finished work, and receive the website and launch materials together.', 'Delivery', 'A tested desktop-and-mobile delivery ready to publish.'],
];

const outcomes = [
  ['Raw product', 'a story worth tasting', 'A good product without a clear flavor story or buying path', 'A bold spicy-peanut-butter homepage with product hierarchy and one clear next step', visualAssets.firejarHero, visualAssets.spicyPeanutButterHomepage],
  ['A leaking sink', 'a clear service path', 'Urgent service information competing without useful order', 'A calm plumbing homepage that makes services and contact easy to understand', visualAssets.leakingSinkBefore, visualAssets.plumbingHomepage],
  ['Uneven curb appeal', 'a cleaner cut', 'Equipment, seasons, and services presented without a clear route', 'A lawn-care homepage that turns visual proof into a simple quote path', visualAssets.greenlineHero, visualAssets.lawnCareHomepage],
];

const transformationPanel = ([from, to, problem, change, before, after], index) => `<article class="transformation-panel" data-reveal>
  <div class="transformation-panel__media">
    <span class="transformation-panel__before">${picture(before, { alt: `${from} interface state`, sizes: '(max-width: 760px) 100vw, 30vw' })}</span>
    <span class="transformation-panel__after">${picture(after, { alt: `${to} interface direction`, sizes: '(max-width: 760px) 100vw, 30vw' })}</span>
    <button type="button" data-transformation-toggle aria-expanded="false" aria-label="Reveal the ${to} website direction"></button>
  </div>
  <span class="micro-label">Transformation ${String(index + 1).padStart(2, '0')}</span>
  <h3>${from} <em>→ ${to}</em></h3>
  <dl><div><dt>Before</dt><dd>${problem}</dd></div><div><dt>Direction</dt><dd>${change}</dd></div></dl>
</article>`;

const faq = (question, answer) => `<details><summary>${question}<span aria-hidden="true">+</span></summary><p>${answer}</p></details>`;

const examplePixels = '<span class="example-website__pixels" aria-hidden="true">' + '<i></i>'.repeat(18) + '</span>';
const exampleWebsite = (example, index) => `<figure class="example-website" data-example-card data-reveal>
  <img src="${example.src}" alt="${example.alt}" width="${example.width}" height="${example.height}" loading="lazy" decoding="async" draggable="false">
  ${examplePixels}
  <figcaption><span>${String(index + 1).padStart(2, '0')}</span><strong>${example.alt.replace(/ homepage concept\.$/, '')}</strong></figcaption>
  <button type="button" data-example-preview aria-expanded="false" aria-label="Enlarge ${example.alt.replace(/\.$/, '')}"></button>
</figure>`;

export function homePage() {
  const pricing = Object.values(plans).map((plan) => planCard(plan, { featured: plan.key === 'complete_revamp', compact: true })).join('');
  const process = processSteps.map(([number, title, copy]) => `<li><span>${number}</span><strong>${title}</strong><p>${copy}</p></li>`).join('');
  const journey = customerJourney.map(([number, title, copy, artifact, receive], index) => `<article class="journey-step journey-step--${index + 1}" data-reveal><span>${number}</span><div><h3>${title}</h3><p>${copy}</p><small class="journey-artifact"><b>${artifact}</b>${receive}</small></div></article>`).join('');

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

    <section class="trust-strip" data-proof-strip data-proof-state="idle" aria-label="AccessRevamp service indicators"><div class="container-wide trust-strip__grid">
      <article class="proof-counter" data-count-state="idle"><span class="proof-status" aria-hidden="true"></span><strong><span data-customer-count="87" data-customer-peak="127" data-count-state="idle" data-count-phase="idle">0</span></strong><p>Customers served</p><small>Owner-verified historical total.</small></article>
      <article class="proof-delivery" data-delivery-step="0"><strong><span data-delivery-days="3" data-delivery-start="30" data-delivery-state="idle">30 days</span></strong><p>first website delivery</p><div class="proof-timeline" aria-label="Brief, build, and first delivery timeline"><span class="proof-timeline__node"><i>01</i>Brief</span><span class="proof-timeline__node"><i>02</i>Build</span><span class="proof-timeline__node"><i>03</i>Deliver</span></div><small>After payment and receipt of required assets.</small></article>
      <article class="proof-responsive"><strong aria-label="Desktop plus mobile"><span data-responsive-copy data-responsive-target="Desktop + mobile" data-copy-state="idle"></span></strong><p>one responsive system</p><div class="responsive-system" aria-hidden="true"><span class="responsive-device responsive-device--laptop"><i class="responsive-device__screen"></i><i class="responsive-device__base"></i></span><span class="responsive-system__flow">→</span><span class="responsive-device responsive-device--phone"><i class="responsive-device__screen"></i></span></div><small>Desktop and mobile, carefully adapted for touch.</small></article>
    </div></section>

    <section class="renaissance-promise" id="promise"><div class="container-wide promise-grid">
      <div><span class="eyebrow">A guided customer journey</span><h2>Your website should feel like a clear conversation—not a maze.</h2></div>
      <p class="promise-lede">AccessRevamp rebuilds the message, page order, mobile experience, and launch material together so every screen answers the next question and leads to one useful action.</p>
      <div class="customer-journey customer-journey--ledger" aria-label="How an AccessRevamp project works">${journey}</div>
    </div></section>

    <section class="section example-websites-section"><div class="container-wide"><div class="chapter-head" data-reveal><span class="chapter-index">Selected concept directions</span><div><h2>Example Websites</h2><p>Complete homepage compositions shown without cropping or simulated browser controls.</p></div></div><div class="example-websites-grid" data-example-grid>${exampleWebsites.map(exampleWebsite).join('')}</div><p class="concept-disclosure">Original working demo — not a client engagement.</p></div></section>

    <section class="showcase-section" aria-labelledby="showcase-title"><div class="container-wide showcase-intro"><span class="eyebrow">Two production depths</span><h2 id="showcase-title">Normal Websites vs. Cinematic Scroll Experiences</h2><p>Scroll down to advance and up to reverse. Each pair shares one progress value.</p></div>${showcasePairs.map(showcaseChapter).join('')}</section>

    <section class="section process-map-section"><div class="container-wide process-story"><div class="process-story__intro"><span class="eyebrow">A visible method</span><h2>From your current site to a finished launch.</h2><p>You can see what happens next at every stage, from the first review through private delivery.</p><a class="text-arrow" href="/process" data-nav>Read the complete process ${icon('arrow')}</a></div><div class="process-story__rail"><ol class="process-map">${process}</ol></div></div></section>

    <section class="section transformation-section"><div class="container-wide"><div class="chapter-head" data-reveal><span class="chapter-index">Transformation studies</span><div><h2>Potential becomes visible when the hierarchy changes.</h2><p>These are original illustrative interfaces. The design reasoning is real; the business outcome still depends on the customer’s offer, traffic, market, and operations.</p></div></div><div class="transformation-grid">${outcomes.map(transformationPanel).join('')}</div></div></section>

    <section class="section services-renaissance"><div class="container-wide"><div class="section-head"><div><span class="eyebrow">Four one-time depths</span><h2>Choose the transformation you need.</h2></div><p>The $50 purchase is never wasted: verified, settled value becomes credit toward $200 or $250.</p></div><div class="upgrade-ribbon" aria-label="Cumulative upgrade credit"><strong>Keep every verified dollar</strong><span>$50 → $200 <b>pay $150</b></span><span>$50 → $250 <b>pay $200</b></span><span>$200 → $250 <b>pay only $50</b></span></div><div class="pricing-grid">${pricing}</div><a class="text-arrow section-link" href="/pricing" data-nav>Compare every deliverable ${icon('arrow')}</a></div></section>

    ${orderWizard()}

    <section class="section faq-section"><div class="container-wide faq-layout"><div><span class="eyebrow">Straight answers</span><h2>Clear scope before checkout.</h2></div><div class="faq-list">${faq('What happens if I buy the $50 plan first?', 'The verified $50 purchase is credited toward a higher tier. Upgrade to the $200 plan for $150, or to the $250 plan for $200.')}${faq('Does the $250 plan include the $200 intake?', 'Yes. It includes the Complete Website Revamp scope, the same page and style brief, plus the cinematic sequence. A verified $200 customer upgrades for $50.')}${faq('Can I share designs I like?', 'Yes. Complete and Cinematic customers can choose page types, describe the style, upload reference images from a phone, and share website links. References guide the direction; AccessRevamp does not copy another brand’s logo, copy, imagery, or exact layout.')}${faq('Are the portfolio businesses real clients?', 'No. Every portfolio brand is an original working demo—not a client engagement.')}</div></div></section>

    <section class="section final-cta-section"><div class="container-wide final-cta final-cta--renaissance"><div class="final-cta__image"><div class="audit-montage"><span>${picture(visualAssets.lawnCareHomepage, { alt: 'Verdant Edge lawn-care homepage direction', sizes: '(max-width: 760px) 76vw, 24vw' })}</span><span>${picture(visualAssets.spicyPeanutButterHomepage, { alt: 'Ember and Jar spicy peanut-butter homepage direction', sizes: '(max-width: 760px) 70vw, 22vw' })}</span><span>${picture(visualAssets.plumbingHomepage, { alt: 'Clearline Plumbing homepage direction', sizes: '(max-width: 760px) 65vw, 20vw' })}</span></div></div><div><span class="eyebrow">Make the potential visible</span><h2>Your storefront already has potential.</h2><p>Bring one public website, one real goal, and the references that feel right for your business.</p><div class="final-cta__actions"><a class="button button--sun" href="/pricing" data-nav>Start my Homepage Reveal ${icon('arrow')}</a><a class="text-arrow" href="/contact?interest=complete_revamp" data-nav>Talk about a complete revamp ${icon('arrow')}</a></div></div></div></section>
  `, { home: true, pathname: '/', pageClass: 'renaissance-home' });
}
