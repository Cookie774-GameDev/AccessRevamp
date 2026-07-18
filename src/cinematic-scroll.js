import './cinematic-scroll.css';
import { plans } from './config.js';

const PLAN_KEY = 'cinematic_scroll';
const plan = plans[PLAN_KEY];
const ROUTES = new Set(['/cinematic-scroll', '/refunds', '/legal']);
let cinematicCleanup = null;

const externalArrow = () => '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 14 14 6M8 6h6v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function isPlainPrimaryClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function makeInternalLink(href, label) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  link.setAttribute('data-cinematic-nav', '');
  return link;
}

function pricingCard() {
  return `
    <article class="price-card cinematic-price-card" data-cinematic-price-card>
      <div class="cinematic-price-badge">Motion experience</div>
      <div class="price-top">
        <div><span class="plan-label">Single-page cinematic build</span><h3>${plan.name}</h3></div>
        <span class="price"><strong>${plan.displayPrice}</strong><small>one time</small></span>
      </div>
      <p>A polished one-page microsite where an AI-assisted cinematic sequence advances with the visitor’s scroll.</p>
      <ul class="check-list">
        <li>One scroll-scrubbed motion sequence with up to four story beats</li>
        <li>One focused landing page with essential copy and one primary CTA</li>
        <li>Responsive desktop and mobile composition</li>
        <li>Reduced-motion and lightweight mobile fallback</li>
        <li>Deployment-ready source and one consolidated revision round</li>
        <li>Target delivery within three business days after complete intake</li>
      </ul>
      <div class="scope-note"><strong>Boundary:</strong> Includes one tightly scoped microsite and one selected motion sequence. Additional pages, ecommerce or account backends, custom 3D production, paid stock or model licenses, ongoing hosting management, and unlimited revisions are excluded unless separately agreed.</div>
      <a class="button button-full" href="${plan.checkoutUrl}" rel="noopener" data-checkout="${PLAN_KEY}">Choose Cinematic Scroll Site</a>
      <a class="cinematic-demo-link" href="/cinematic-scroll" data-cinematic-nav>Try the interactive portfolio demo ${externalArrow()}</a>
      ${plan.checkoutUrl.includes('/test_') ? '<span class="sandbox-badge" title="Stripe test mode is active">Sandbox checkout</span>' : ''}
    </article>`;
}

function injectPricing() {
  const grid = document.querySelector('.pricing-grid');
  if (!grid || grid.querySelector('[data-cinematic-price-card]')) return;
  grid.insertAdjacentHTML('beforeend', pricingCard());
  grid.classList.add('pricing-grid--three');

  if (location.pathname === '/pricing') {
    const heroEyebrow = document.querySelector('.page-hero .eyebrow');
    const heroHeading = document.querySelector('.page-hero h1');
    const heroLede = document.querySelector('.page-hero .lede');
    if (heroEyebrow) heroEyebrow.textContent = 'Three plans. No subscription.';
    if (heroHeading) heroHeading.textContent = 'Three one-time ways to improve the experience.';
    if (heroLede) heroLede.textContent = 'Choose a reviewed homepage direction, a complete agreed revamp with marketing creatives, or a cinematic single-page motion build.';

    const subscriptionQuestion = [...document.querySelectorAll('.faq-list summary')].find((summary) => summary.textContent.includes('Is either plan a subscription?'));
    if (subscriptionQuestion) subscriptionQuestion.firstChild.textContent = 'Are any AccessRevamp plans subscriptions?';

    const faqList = document.querySelector('.faq-list');
    if (faqList && !faqList.querySelector('[data-cinematic-faq]')) {
      const details = document.createElement('details');
      details.dataset.cinematicFaq = 'true';
      details.innerHTML = '<summary>What is included in the $250 cinematic scroll site?<span>+</span></summary><p>One single-page microsite, one scroll-controlled AI-assisted motion sequence with up to four story beats, essential copy, one primary call to action, responsive desktop and mobile behavior, a reduced-motion fallback, deployment-ready source, and one consolidated revision round. The three-business-day target begins after payment and complete intake. Additional pages, complex backends, custom 3D production, paid media assets, and unlimited revisions are outside the included scope.</p>';
      faqList.append(details);
    }
  }
}

function cinematicPortfolioFeature(compact = false) {
  return `
    <article class="cinematic-portfolio-card${compact ? ' cinematic-portfolio-card--compact' : ''}" data-cinematic-portfolio-card>
      <a class="cinematic-portfolio-visual" href="/cinematic-scroll" data-cinematic-nav aria-label="Open the Aether One cinematic scroll-site concept">
        <div class="cinematic-mini-stage" aria-hidden="true">
          <span class="cinematic-mini-grid"></span>
          <span class="cinematic-mini-orbit cinematic-mini-orbit--one"></span>
          <span class="cinematic-mini-orbit cinematic-mini-orbit--two"></span>
          <span class="cinematic-mini-product"><i></i></span>
          <span class="cinematic-mini-copy"><small>AETHER / 01</small><b>Motion, directed<br>by the scroll.</b><em>Explore the sequence</em></span>
        </div>
      </a>
      <div class="cinematic-portfolio-body">
        <span class="portfolio-card__category">Cinematic scroll-site concept</span>
        <h3>Aether One</h3>
        <p>An original interactive product story demonstrating a pinned, scroll-scrubbed visual sequence with readable copy, a mobile fallback, and reduced-motion support.</p>
        <a class="portfolio-card__source" href="/cinematic-scroll" data-cinematic-nav>Open interactive concept ${externalArrow()}</a>
      </div>
    </article>`;
}

function injectPortfolio() {
  const main = document.querySelector('#main-content');
  if (!main) return;

  if (location.pathname === '/' && main.querySelector('[data-portfolio-home]') && !main.querySelector('[data-cinematic-home-feature]')) {
    const section = document.createElement('div');
    section.dataset.cinematicHomeFeature = 'true';
    section.className = 'cinematic-home-feature';
    section.innerHTML = cinematicPortfolioFeature(true);
    const disclaimer = main.querySelector('[data-portfolio-home] .portfolio-disclaimer');
    (disclaimer || main.querySelector('[data-portfolio-home] .portfolio-grid'))?.before(section);
  }

  if (location.pathname === '/portfolio' && !main.querySelector('[data-cinematic-portfolio-section]')) {
    const section = document.createElement('section');
    section.className = 'section cinematic-portfolio-section';
    section.dataset.cinematicPortfolioSection = 'true';
    section.innerHTML = `
      <div class="container">
        <div class="portfolio-heading portfolio-heading--section">
          <div><span class="eyebrow">Scroll-driven motion</span><h2>A cinematic sequence that moves only when the visitor does.</h2></div>
          <p>This original fictional concept demonstrates the interaction style behind the $250 plan. It does not reproduce the referenced X post or represent completed client work.</p>
        </div>
        ${cinematicPortfolioFeature()}
      </div>`;
    const processSection = main.querySelector('.portfolio-process')?.closest('section');
    (processSection || main.lastElementChild)?.before(section);

    const count = main.querySelector('.portfolio-hero__stack b');
    const label = main.querySelector('.portfolio-hero__stack small');
    if (count) count.textContent = '7';
    if (label) label.textContent = 'original concepts';
  }
}

function legalHubPage() {
  return `
    <section class="page-hero legal-hero"><div class="container narrow"><span class="eyebrow">AccessRevamp legal center</span><h1>Clear terms before a project begins.</h1><p class="lede">Review the policies that govern payment, delivery, refunds, privacy, accessibility, and responsible use of AI-assisted media.</p></div></section>
    <section class="section section-tight"><div class="container legal-hub-grid">
      <a href="/terms" data-cinematic-nav><span>01</span><h2>Service terms</h2><p>Scope, customer responsibilities, delivery, ownership, limitations, and third-party tools.</p></a>
      <a href="/refunds" data-cinematic-nav><span>02</span><h2>Refunds & cancellation</h2><p>Full refund requests before final digital delivery and the resolution process after delivery.</p></a>
      <a href="/privacy" data-cinematic-nav><span>03</span><h2>Privacy notice</h2><p>How contact, account, project, payment, and AI-production information is handled.</p></a>
      <a href="/accessibility" data-cinematic-nav><span>04</span><h2>Accessibility statement</h2><p>AccessRevamp’s public-site accessibility commitments and feedback path.</p></a>
    </div></section>
    <section class="section section-tight"><div class="container legal-counsel-note"><strong>Important:</strong><span>These documents are operational drafts for the current U.S.-first launch and are not a substitute for advice from a qualified attorney. Applicable consumer rights cannot be waived by these policies.</span></div></section>`;
}

function refundsPage() {
  return `
    <section class="page-hero legal-hero"><div class="container narrow"><span class="eyebrow">Last updated July 18, 2026</span><h1>Refund & cancellation policy</h1><p class="lede">A customer may request a full refund before AccessRevamp makes the final website, report, creative pack, or other purchased digital deliverable available.</p></div></section>
    <section class="section section-tight"><div class="container narrow legal-copy refund-policy">
      <h2>1. Full refund before final delivery</h2>
      <p>Send a refund request through the AccessRevamp contact page using the checkout email and enough information to identify the order. A qualifying request received before final digital delivery is approved for a full refund to the original payment method.</p>
      <h2>2. What counts as final delivery</h2>
      <p>Final delivery occurs when AccessRevamp sends the customer the completed files or report, provides the final private delivery link, publishes the agreed website to the approved destination, or otherwise makes the completed purchased deliverable available for use.</p>
      <h2>3. After final delivery</h2>
      <p>After final delivery, change-of-mind refunds are not offered. AccessRevamp will correct a material defect, missing agreed item, or material mismatch with the written scope when reported promptly and with enough detail to reproduce the problem. This policy does not limit rights that cannot legally be excluded.</p>
      <h2>4. Three-business-day products</h2>
      <p>The Homepage Reveal and Cinematic Scroll Site are targeted for final delivery within three business days after payment and complete intake. The Quick Fix Plan’s reviewed findings, design direction, and creative-pack deliverables target the same three-business-day window; the complete implementation schedule is confirmed separately when scope and access are known.</p>
      <p>If AccessRevamp misses an applicable written three-business-day delivery promise and the customer has not approved an extension, the customer may cancel for a full refund before accepting late delivery.</p>
      <h2>5. Customer-caused delay</h2>
      <p>The delivery clock does not begin until required brand assets, copy, public URLs, access, decisions, and approvals have been received. It pauses while AccessRevamp is waiting for required customer action or while a third-party platform blocks the agreed work.</p>
      <h2>6. Refund processing</h2>
      <p>Approved refunds are submitted through Stripe to the original payment method. AccessRevamp sends confirmation when the refund is initiated; the customer’s bank controls when the credit becomes visible.</p>
      <h2>7. Non-refundable outside costs</h2>
      <p>AccessRevamp will not purchase paid stock, model licenses, printing, advertising, domains, or other third-party items without written approval. If a separately approved third-party purchase is non-refundable, that fact and amount must be disclosed before purchase.</p>
      <h2>8. Contact</h2>
      <p>Use the <a href="/contact" data-cinematic-nav>contact form</a> to request a refund or report a delivery problem. Do not include passwords, payment-card details, or secret keys.</p>
    </div></section>`;
}

function cinematicPage() {
  return `
    <section class="cinematic-page-hero">
      <div class="container cinematic-page-hero__grid">
        <div><span class="eyebrow">$250 · one-time motion experience</span><h1>A website that plays at the speed of the scroll.</h1><p class="lede">A tightly scoped cinematic microsite with one AI-assisted visual sequence, mapped to native scrolling and delivered with a responsive mobile fallback.</p><div class="hero-actions"><a class="button" href="${plan.checkoutUrl}" data-checkout="${PLAN_KEY}" rel="noopener">Book the cinematic build</a><a class="button button-ghost" href="#cinematic-demo">Experience the demo</a></div><div class="cinematic-promise-row"><span>One page</span><span>Up to four beats</span><span>One revision</span><span>Three-business-day target</span></div></div>
        <div class="cinematic-hero-orb" aria-hidden="true"><span></span><i></i><em>A / 01</em></div>
      </div>
    </section>
    <section class="cinematic-explainer"><div class="container cinematic-explainer__grid"><div><span class="eyebrow">How the interaction works</span><h2>The scrollbar becomes the playhead.</h2></div><p>The visual sequence stays pinned while scroll progress advances its timeline. Text and calls to action remain real HTML, so the experience can still be readable, responsive, and usable instead of becoming a video-only page.</p></div></section>
    <section class="cinematic-scroll-stage" id="cinematic-demo" data-cinematic-stage>
      <div class="cinematic-sticky">
        <canvas data-cinematic-canvas aria-hidden="true"></canvas>
        <div class="cinematic-film-grain" aria-hidden="true"></div>
        <div class="cinematic-stage-brand"><span>AETHER / ONE</span><small>ORIGINAL ACCESSREVAMP CONCEPT</small></div>
        <div class="cinematic-beat" data-beat="0"><small>01 · ARRIVAL</small><h2>Enter the signal.</h2><p>A restrained opening lets the motion establish mood before copy asks for attention.</p></div>
        <div class="cinematic-beat" data-beat="1"><small>02 · FORM</small><h2>Reveal the object.</h2><p>The product silhouette resolves as the visitor continues, with no autoplay or forced timing.</p></div>
        <div class="cinematic-beat" data-beat="2"><small>03 · PROOF</small><h2>Make the detail tangible.</h2><p>One controlled movement supports the claim instead of competing with it.</p></div>
        <div class="cinematic-beat cinematic-beat--final" data-beat="3"><small>04 · ACTION</small><h2>One scene. One decision.</h2><p>A clear final call to action appears after the story earns it.</p><a class="button" href="/pricing" data-cinematic-nav>View the complete scope</a></div>
        <div class="cinematic-progress" aria-hidden="true"><span data-cinematic-progress></span></div>
        <div class="cinematic-scroll-hint" aria-hidden="true"><span></span>Scroll to direct the sequence</div>
      </div>
    </section>
    <section class="section cinematic-scope"><div class="container">
      <div class="portfolio-heading portfolio-heading--section"><div><span class="eyebrow">Bounded production scope</span><h2>Designed to look premium without becoming an unlimited motion project.</h2></div><p>The production workflow may use Higgsfield or a comparable AI media tool when appropriate, but the final sequence, copy, rights, responsive behavior, and delivery still receive human review.</p></div>
      <div class="cinematic-scope-grid">
        <article><span>Included</span><h3>One focused microsite</h3><p>One page, one motion sequence, up to four beats, one CTA, essential copy integration, responsive source, and one consolidated revision round.</p></article>
        <article><span>Mobile first</span><h3>A lighter path for phones</h3><p>Reduced frame density, capped resolution, native scrolling, readable text, touch-safe controls, and a static fallback when motion is reduced.</p></article>
        <article><span>Not included</span><h3>No hidden production expansion</h3><p>Additional pages, ecommerce or account systems, custom 3D modeling, paid actors, filming, paid stock, ongoing hosting, and unlimited revisions require separate scope.</p></article>
      </div>
    </section>
    <section class="section section-tint"><div class="container cinematic-delivery-grid"><div><span class="eyebrow">Delivery & refunds</span><h2>Three business days after complete intake.</h2><p>The clock begins after payment and receipt of the required assets, copy, access, and decisions. A full refund may be requested before final digital delivery.</p></div><div class="cinematic-delivery-card"><strong>${plan.displayPrice}</strong><span>one-time service</span><a class="button button-full" href="${plan.checkoutUrl}" data-checkout="${PLAN_KEY}" rel="noopener">Open secure checkout</a><a href="/refunds" data-cinematic-nav>Read the refund policy</a></div></div></section>`;
}

function injectNavigation() {
  const desktopNav = document.querySelector('.desktop-nav');
  if (desktopNav && !desktopNav.querySelector('[data-cinematic-plan-link]')) {
    const pricing = desktopNav.querySelector('a[href="/pricing"]');
    const link = makeInternalLink('/cinematic-scroll', 'Motion');
    link.dataset.cinematicPlanLink = '';
    desktopNav.insertBefore(link, pricing || null);
  }

  const mobileNav = document.querySelector('.mobile-nav nav');
  if (mobileNav && !mobileNav.querySelector('[data-cinematic-plan-link]')) {
    const pricing = mobileNav.querySelector('a[href="/pricing"]');
    const link = makeInternalLink('/cinematic-scroll', 'Cinematic scroll site');
    link.dataset.cinematicPlanLink = '';
    mobileNav.insertBefore(link, pricing || null);
  }

  const companyColumn = [...document.querySelectorAll('.footer-grid > div')].find((column) => column.querySelector('h2')?.textContent.trim() === 'Company');
  if (companyColumn && !companyColumn.querySelector('[data-refunds-link]')) {
    const refunds = makeInternalLink('/refunds', 'Refunds');
    refunds.dataset.refundsLink = '';
    const legal = makeInternalLink('/legal', 'Legal center');
    legal.dataset.legalLink = '';
    const terms = companyColumn.querySelector('a[href="/terms"]');
    companyColumn.insertBefore(refunds, terms || null);
    companyColumn.insertBefore(legal, terms || null);
  }
}

function appendLegalListItem(path, text, marker) {
  if (location.pathname !== path) return;
  const list = document.querySelector('.legal-copy ul');
  if (!list || list.querySelector(`[${marker}]`)) return;
  const item = document.createElement('li');
  item.setAttribute(marker, 'true');
  item.textContent = text;
  list.append(item);
}

function injectExistingLegalPages() {
  if (['/terms', '/privacy'].includes(location.pathname)) {
    const updated = document.querySelector('.legal-hero .eyebrow');
    if (updated) updated.textContent = 'Last updated July 18, 2026';
  }
  appendLegalListItem('/terms', 'Cinematic Scroll Site is a $250 one-time, single-page motion microsite with one scroll-scrubbed AI-assisted sequence, up to four story beats, one primary CTA, responsive and reduced-motion fallbacks, deployment-ready source, and one consolidated revision round. Additional pages, backends, custom 3D production, paid media assets, and ongoing hosting are excluded unless separately agreed.', 'data-cinematic-terms');
  appendLegalListItem('/terms', 'The Homepage Reveal and Cinematic Scroll Site target final delivery within three business days after payment and complete intake. Quick Fix initial findings, design direction, and creative-pack deliverables target the same window; the full implementation date is confirmed in writing after scope, access, and dependencies are known.', 'data-delivery-terms');
  appendLegalListItem('/terms', 'After full payment, the customer receives the agreed rights to custom final code and original final assets created specifically for the project, excluding AccessRevamp pre-existing tools and templates, open-source software, third-party assets, fonts, model outputs subject to provider terms, and customer-supplied materials.', 'data-rights-terms');
  appendLegalListItem('/terms', 'AI may assist media, copy, and layout production. AccessRevamp does not guarantee that a specific third-party model or provider will remain available. The customer must have rights to supplied assets and must approve factual claims, offers, likenesses, trademarks, and required disclosures.', 'data-ai-terms');
  appendLegalListItem('/privacy', 'When a project uses an AI media provider, AccessRevamp sends only the project information reasonably needed to create the agreed media. Customers must not submit sensitive personal data, private customer records, passwords, payment-card data, or confidential materials that are not required for the project.', 'data-ai-privacy');
}

function setMeta(title, description) {
  document.title = `${title} | AccessRevamp`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
}

function drawCinematicFrame(canvas, progress) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const p = Math.max(0, Math.min(1, progress));
  const phase = p * 4;

  const colorStops = [
    ['#03040a', '#15113a', '#5e42ff'],
    ['#07101b', '#0c3145', '#63e6d4'],
    ['#120615', '#51134b', '#ff7bd5'],
    ['#04070e', '#13293f', '#8aa8ff'],
  ];
  const scene = Math.min(3, Math.floor(phase));
  const local = phase - scene;
  const colors = colorStops[scene];
  const gradient = ctx.createRadialGradient(width * (0.42 + p * 0.16), height * 0.48, width * 0.03, width * 0.5, height * 0.5, width * 0.85);
  gradient.addColorStop(0, colors[2]);
  gradient.addColorStop(0.24, colors[1]);
  gradient.addColorStop(1, colors[0]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = 'rgba(220,240,255,.14)';
  ctx.lineWidth = Math.max(1, width / 1800);
  const horizon = height * (0.55 + Math.sin(p * Math.PI) * 0.05);
  for (let i = -8; i <= 8; i += 1) {
    const x = width * 0.5 + i * width * 0.075;
    ctx.beginPath();
    ctx.moveTo(width * 0.5, horizon);
    ctx.lineTo(x + (x - width * 0.5) * 2.6, height * 1.05);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i += 1) {
    const t = i / 11;
    const y = horizon + (height - horizon) * t * t;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 92; i += 1) {
    const seed = Math.sin(i * 91.73 + 17.1) * 43758.5453;
    const x = ((seed - Math.floor(seed)) * width + p * width * (0.04 + (i % 5) * 0.006)) % width;
    const ySeed = Math.sin(i * 37.11 + 7.9) * 14413.37;
    const y = (ySeed - Math.floor(ySeed)) * height * 0.78;
    const radius = (i % 7 === 0 ? 2.2 : 1) * Math.max(1, width / 1600);
    ctx.globalAlpha = 0.2 + (i % 5) * 0.08;
    ctx.fillStyle = i % 4 === 0 ? '#b9fff0' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const cx = width * (0.5 + Math.sin(p * Math.PI * 1.6) * 0.08);
  const cy = height * (0.5 + Math.cos(p * Math.PI * 1.3) * 0.035);
  const scale = Math.min(width, height) * (0.13 + p * 0.045);
  const rotation = -0.2 + p * 0.65;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  const glow = ctx.createRadialGradient(0, 0, scale * 0.1, 0, 0, scale * 1.8);
  glow.addColorStop(0, 'rgba(255,255,255,.32)');
  glow.addColorStop(0.35, scene === 2 ? 'rgba(255,123,213,.25)' : 'rgba(99,230,212,.22)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, scale * 1.8, 0, Math.PI * 2);
  ctx.fill();

  const bodyGradient = ctx.createLinearGradient(-scale, -scale, scale, scale);
  bodyGradient.addColorStop(0, '#edf8ff');
  bodyGradient.addColorStop(0.25, '#99b9cc');
  bodyGradient.addColorStop(0.55, '#203445');
  bodyGradient.addColorStop(0.78, '#09121c');
  bodyGradient.addColorStop(1, '#c7eff2');
  ctx.fillStyle = bodyGradient;
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = scale * 0.32;
  const bodyWidth = scale * (0.7 + Math.sin(p * Math.PI) * 0.12);
  const bodyHeight = scale * 1.75;
  const radius = bodyWidth * 0.42;
  ctx.beginPath();
  ctx.roundRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, radius);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,.52)';
  ctx.lineWidth = Math.max(1, scale * 0.012);
  ctx.stroke();
  ctx.fillStyle = 'rgba(5,10,18,.84)';
  ctx.beginPath();
  ctx.roundRect(-bodyWidth * 0.34, -bodyHeight * 0.15, bodyWidth * 0.68, bodyHeight * 0.42, bodyWidth * 0.09);
  ctx.fill();
  ctx.fillStyle = '#d9fdf7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(12, scale * 0.1)}px Arial, sans-serif`;
  ctx.fillText('AETHER', 0, -bodyHeight * 0.03);
  ctx.font = `${Math.max(8, scale * 0.045)}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(217,253,247,.7)';
  ctx.fillText('ONE / MOTION OBJECT', 0, bodyHeight * 0.08);
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = scene === 2 ? 'rgba(255,160,230,.6)' : 'rgba(120,245,225,.55)';
  ctx.lineWidth = Math.max(1, scale * 0.008);
  for (let ring = 0; ring < 3; ring += 1) {
    const ringRadius = scale * (0.85 + ring * 0.34 + local * 0.16);
    ctx.globalAlpha = 0.5 - ring * 0.11;
    ctx.beginPath();
    ctx.ellipse(0, 0, ringRadius, ringRadius * (0.24 + ring * 0.035), rotation + ring * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.25, width / 2, height / 2, Math.max(width, height) * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.72)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function setupCinematicCanvas() {
  const stage = document.querySelector('[data-cinematic-stage]');
  const canvas = stage?.querySelector('[data-cinematic-canvas]');
  if (!stage || !canvas) return null;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let lastProgress = -1;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    lastProgress = -1;
    update();
  };

  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rect = stage.getBoundingClientRect();
      const scrollable = Math.max(1, stage.offsetHeight - window.innerHeight);
      const raw = Math.max(0, Math.min(1, -rect.top / scrollable));
      const progress = reducedMotion.matches ? 0.78 : raw;
      if (Math.abs(progress - lastProgress) < 0.001 && lastProgress >= 0) return;
      lastProgress = progress;
      drawCinematicFrame(canvas, progress);
      stage.style.setProperty('--cinematic-progress', progress.toFixed(4));
      stage.querySelector('[data-cinematic-progress]')?.style.setProperty('transform', `scaleX(${progress})`);
      stage.querySelectorAll('[data-beat]').forEach((beat) => {
        const index = Number(beat.dataset.beat);
        const center = index / 3;
        const distance = Math.abs(progress - center);
        const opacity = Math.max(0, 1 - distance / 0.21);
        beat.style.opacity = opacity.toFixed(3);
        beat.style.transform = `translate3d(0, ${(1 - opacity) * 34}px, 0)`;
        beat.toggleAttribute('aria-hidden', opacity < 0.08);
      });
    });
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', resize);
  reducedMotion.addEventListener?.('change', update);
  resize();

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', resize);
    reducedMotion.removeEventListener?.('change', update);
  };
}

function renderCustomRoute() {
  const main = document.querySelector('#main-content');
  if (!main) return;

  if (location.pathname === '/cinematic-scroll') {
    if (main.dataset.cinematicRoute !== 'cinematic-scroll') {
      cinematicCleanup?.();
      main.dataset.cinematicRoute = 'cinematic-scroll';
      main.innerHTML = cinematicPage();
      cinematicCleanup = setupCinematicCanvas();
    }
    setMeta('Cinematic Scroll Site — $250', 'A one-time $250 cinematic single-page microsite with a scroll-scrubbed AI-assisted motion sequence, responsive mobile fallback, and three-business-day delivery target.');
    return;
  }

  cinematicCleanup?.();
  cinematicCleanup = null;

  if (location.pathname === '/refunds') {
    if (main.dataset.cinematicRoute !== 'refunds') {
      main.dataset.cinematicRoute = 'refunds';
      main.innerHTML = refundsPage();
    }
    setMeta('Refund & cancellation policy', 'Read AccessRevamp’s policy for full refund requests before final digital delivery, delivery timing, defects, and cancellation.');
    return;
  }

  if (location.pathname === '/legal') {
    if (main.dataset.cinematicRoute !== 'legal') {
      main.dataset.cinematicRoute = 'legal';
      main.innerHTML = legalHubPage();
    }
    setMeta('Legal center', 'AccessRevamp service terms, refund policy, privacy notice, and accessibility statement.');
  }
}

function applyCinematicExperience() {
  injectNavigation();
  renderCustomRoute();
  injectPricing();
  injectPortfolio();
  injectExistingLegalPages();
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-cinematic-nav]');
  if (!link || !isPlainPrimaryClick(event) || link.target === '_blank') return;
  const url = new URL(link.href, location.origin);
  if (url.origin !== location.origin) return;
  event.preventDefault();
  if (url.pathname === location.pathname) return;
  history.pushState({}, '', url.pathname + url.hash);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});

const app = document.querySelector('#app');
if (app) new MutationObserver(applyCinematicExperience).observe(app, { childList: true, subtree: true });
window.addEventListener('popstate', () => requestAnimationFrame(applyCinematicExperience));
applyCinematicExperience();

export { PLAN_KEY, ROUTES, drawCinematicFrame };
