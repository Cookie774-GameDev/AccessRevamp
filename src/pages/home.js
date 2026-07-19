import { plans } from '../config.js';
import { planCard } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';
import { demoBrands, picture, visualAssets } from '../data/visual-assets.js';
import { lenses } from '../data/lenses.js';
import { lensVisual } from '../components/lens-visuals.js';

/* Legacy image list retained for the portfolio evidence panels. */
const lensAssets = [
  visualAssets.auditAfter,
  visualAssets.greenlineInterface,
  visualAssets.firejarInterface,
  visualAssets.clearflowInterface,
  visualAssets.firejarHero,
  visualAssets.greenlineHero,
  visualAssets.auditBefore,
  visualAssets.firejarGentle,
  visualAssets.evidenceLayers,
  visualAssets.greenlineDetail,
  visualAssets.clearflowDetail,
];

const diagnosticCategoriesLegacy = [
  { title: 'Accessibility', summary: 'Can more people perceive, navigate, and complete the task?', explanation: 'We review the ordinary public experience for barriers that interrupt reading, navigation, and form completion.', checks: ['Keyboard path and focus', 'Labels and structure', 'Contrast and alternatives'], outcome: 'A clearer list of barriers to verify and prioritize.', tone: 'mint' },
  { title: 'Usability', summary: 'Does the next useful step feel obvious?', explanation: 'We trace the page as a first-time visitor would, separating understandable choices from avoidable friction.', checks: ['Navigation clarity', 'Decision load', 'Error recovery'], outcome: 'A more deliberate path through the main task.', tone: 'sun' },
  { title: 'Mobile', summary: 'Does the hierarchy survive a narrow screen?', explanation: 'We review wrapping, tap targets, order, sticky elements, and the point where desktop assumptions break.', checks: ['390px reading order', 'Tap target spacing', 'Overflow and clipping'], outcome: 'A mobile experience that keeps the same clear intent.', tone: 'coral' },
  { title: 'Performance', summary: 'Does the page make visitors wait for meaning?', explanation: 'We examine visible load behavior and asset weight without pretending a single automated score explains the whole experience.', checks: ['Hero loading path', 'Layout stability', 'Image and script weight'], outcome: 'A prioritized path to faster perceived usefulness.', tone: 'ink' },
  { title: 'Content', summary: 'Can someone understand the offer quickly?', explanation: 'We compare headlines, supporting proof, caveats, and actions for consistency and useful specificity.', checks: ['Offer clarity', 'Proof sequence', 'Plain-language actions'], outcome: 'Copy that helps visitors recognize what they can do.', tone: 'cream' },
  { title: 'SEO/local discovery', summary: 'Can searchers and local visitors find the right page?', explanation: 'We review public-page signals that help a service, place, or topic match the visitor’s actual intent.', checks: ['Page purpose and title', 'Local service cues', 'Useful internal paths'], outcome: 'A clearer discovery structure to validate and improve.', tone: 'mint' },
  { title: 'Conversion', summary: 'Does one primary action lead the decision?', explanation: 'We map competing actions, confidence cues, and the sequence from understanding to commitment.', checks: ['Primary action weight', 'Objection coverage', 'Form effort'], outcome: 'A decision path with less unnecessary competition.', tone: 'coral' },
  { title: 'Monetization', summary: 'Are price, scope, and upgrade choices understandable?', explanation: 'We look for ambiguity around what is purchased, what changes by tier, and what remains outside scope.', checks: ['Price visibility', 'Tier differentiation', 'Scope boundaries'], outcome: 'A more legible commercial offer without invented urgency.', tone: 'sun' },
  { title: 'Analytics', summary: 'Can useful decisions be measured safely?', explanation: 'We identify the small set of events needed to understand the main task without collecting sensitive form content.', checks: ['Task-start events', 'Completion signals', 'Sensitive-data boundaries'], outcome: 'A bounded measurement plan tied to real decisions.', tone: 'ink' },
  { title: 'Social growth', summary: 'Does the website create material worth sharing?', explanation: 'We connect the offer and proof sequence to useful publishing ideas rather than promising reach or virality.', checks: ['Proof-ready moments', 'Teaching material', 'Clear destination pages'], outcome: 'A practical publishing rhythm grounded in the site.', tone: 'cream' },
  { title: 'Security hygiene', summary: 'Are public trust and testing boundaries explicit?', explanation: 'We observe ordinary public hygiene and name where active testing would require exact written authorization.', checks: ['Public trust cues', 'Form and privacy language', 'Authorization boundary'], outcome: 'Clearer trust language and a safe next-step boundary.', tone: 'mint' },
].map((lens, index) => ({ ...lens, asset: lensAssets[index] }));

const diagnosticCategories = lenses;

const processSteps = [
  ['01', 'Scout', 'Read the public surface and record possible friction.'],
  ['02', 'Verify', 'Separate observable evidence from inference.'],
  ['03', 'Preview', 'Shape a private, bounded direction.'],
  ['04', 'Approve', 'A human confirms claims, scope, and next action.'],
  ['05', 'Build', 'Produce only the agreed one-time deliverable.'],
  ['06', 'Measure', 'Retest the experience and document what remains.'],
];

const demos = [
  { href: '/portfolio/greenline-lawn-and-grounds', number: '01', name: 'Greenline Lawn & Grounds', type: 'Local service lead generation', action: 'Check an area and build a quote', art: 'greenline', asset: demoBrands.greenline.interface },
  { href: '/portfolio/firejar-spicy-peanut-butter', number: '02', name: 'Firejar Spicy Peanut Butter', type: 'Product collection and cart', action: 'Browse heat levels and build a demo cart', art: 'firejar', asset: demoBrands.firejar.interface },
  { href: '/portfolio/clearflow-plumbing', number: '03', name: 'Clearflow Plumbing', type: 'Urgent and planned service paths', action: 'Choose the right next step without panic', art: 'clearflow', asset: demoBrands.clearflow.interface },
];

const deliverables = [
  ['Free Snapshot', '$0', 'One human-reviewed public finding', 'A useful starting point—not an automated audit dump.'],
  ['Homepage Reveal', '$50', 'Report, redesigned landing direction, desktop/mobile PNGs, 30-day growth plan', 'Observed evidence stays separate from recommendations and concepts.'],
  ['Complete Website Revamp', '$200', 'Everything in Reveal plus an agreed implementation of up to five standard pages', 'Scope, platform access, assets, and revision boundary are written first.'],
  ['Cinematic Scroll Site', '$250', 'Everything in Complete plus one four-beat cinematic narrative', 'Includes mobile, static, media-failure, and reduced-motion fallbacks.'],
];

const demoDisclosure = 'Independent concept build';
const faq = (question, answer) => `<details><summary>${question}<span aria-hidden="true">+</span></summary><p>${answer}</p></details>`;

const lensTile = (lens, index) => {
  const number = String(index + 1).padStart(2, '0');
  const id = `lens-detail-${index + 1}`;
  return `<button class="lens-tile lens-tile--${lens.tone}" type="button" data-lens aria-expanded="false" aria-controls="${id}">
    <span class="lens-tile__top"><b>${number}</b><span>Explore <i aria-hidden="true">+</i></span></span>
    <span class="lens-tile__visual" data-lens-visual="${lens.visual}">${lensVisual(lens.visual)}</span>
    <span class="lens-tile__summary"><strong>${lens.title}</strong><span>${lens.summary}</span></span>
    <span class="lens-tile__detail" id="${id}"><span>We inspect this lens against the page’s primary visitor task and document observable evidence before recommending a change.</span><b>What we check</b><span class="lens-tile__checks">${lens.checks.map((check) => `<i>${check}</i>`).join('')}</span><b>Practical direction</b><span>${lens.outcome}</span></span>
  </button>`;
};

const demoCard = (demo) => `<article class="demo-card demo-card--${demo.art}" data-reveal>
  <a class="demo-card__visual" href="${demo.href}" data-nav aria-label="Open ${demo.name} working demo">
    <span class="demo-card__image">${picture(demo.asset, { alt: `${demo.name} working demonstration shown in a desktop browser`, sizes: '(max-width: 760px) 100vw, 55vw' })}</span>
    <span class="demo-card__number">${demo.number}</span><span class="demo-card__action">${demo.action} ${icon('arrow')}</span>
  </a>
  <div class="demo-card__copy"><span class="micro-label">${demo.type}</span><h3><a href="${demo.href}" data-nav>${demo.name}</a></h3><p>${demoDisclosure}</p></div>
</article>`;

export function homePage() {
  const pricing = Object.values(plans).map((plan) => planCard(plan, { featured: plan.key === 'complete_revamp', compact: true })).join('');
  const process = processSteps.map(([number, title, copy]) => `<li><span>${number}</span><strong>${title}</strong><p>${copy}</p></li>`).join('');

  return shell(`
    <section class="home-audit-hero" data-chapter="audit-lens" data-audit-stage>
      <div class="container-wide home-audit-hero__grid">
        <div class="home-audit-hero__copy">
          <span class="eyebrow">Evidence-led website revamps</span>
          <h1>Your website is already telling us <em>where customers get stuck.</em></h1>
          <p class="lede">AccessRevamp verifies the friction, redesigns the next step, and gives you a one-time path from evidence to a better site.</p>
          <div class="hero-actions"><a class="button" href="/pricing" data-nav>Get the $50 Homepage Reveal ${icon('arrow')}</a><a class="text-arrow hero-proof-link" href="/sample-report" data-nav>See a verified example ${icon('arrow')}</a></div>
          <p class="hero-boundary"><span>Public pages only</span><span>Human-reviewed</span><span>No invented outcomes</span></p>
        </div>
        <figure class="hero-visual-stack" aria-label="Illustrative website hierarchy transformation">
          <div class="browser-frame browser-frame--hero"><div class="browser-frame__bar"><i></i><i></i><i></i><span>accessrevamp / hierarchy direction</span></div>${picture(visualAssets.auditAfter, { alt: 'Fictional Greenline website direction with one clear primary action', loading: 'eager', fetchpriority: 'high', sizes: '(max-width: 1100px) 100vw, 48vw' })}<span class="audit-pin audit-pin--direction">Direction</span></div>
          <div class="device-frame"><span>Observed</span>${picture(visualAssets.auditBefore, { alt: 'Fictional homepage before state with competing actions', sizes: '(max-width: 760px) 42vw, 13vw' })}</div>
          <div class="audit-note"><span>Evidence / H-01</span><strong>Three equal actions arrive before supporting proof.</strong><small>Illustrative finding—not a client claim.</small></div>
        </figure>
      </div>
    </section>

    <section class="trust-rail" aria-label="Service principles" data-chapter="trust"><div class="container-wide trust-rail__grid"><span>Public pages</span><span>Evidence before claims</span><span>Human review</span><span>One-time pricing</span></div></section>

    <section class="section spectrum-section" data-chapter="diagnostic-spectrum"><div class="container-wide"><div class="chapter-head" data-reveal><span class="chapter-index">02 / Diagnostic spectrum</span><div><h2>One website.<br>Eleven useful lenses.</h2><p>Automation can point. A person must verify. Open a lens to see what we check and the practical direction it can create.</p></div></div><div class="lens-mosaic" data-lens-grid>${diagnosticCategories.map(lensTile).join('')}</div></div></section>

    <section class="section walkthrough-section" data-chapter="before-evidence-after"><div class="container-wide"><div class="chapter-head chapter-head--light" data-reveal><span class="chapter-index">03 / Evidence walkthrough</span><div><h2>Do not jump<br>from before to after.</h2><p>The middle step—evidence—is where design earns the right to change something.</p></div></div><div class="evidence-walkthrough">
      <article class="walkthrough-panel walkthrough-panel--before" tabindex="0" data-reveal><span class="walkthrough-label">Before</span><div class="evidence-image">${picture(visualAssets.auditBefore, { alt: 'Illustrative homepage before state with three equal-weight actions', sizes: '(max-width: 760px) 100vw, 32vw' })}<span class="annotation-ring annotation-ring--before" aria-hidden="true"></span></div><h3>Everything asks for attention.</h3><p>Navigation, offer, proof, and three actions compete at the same visual volume.</p><small>Illustrative fictional interface.</small></article>
      <article class="walkthrough-panel walkthrough-panel--evidence" tabindex="0" data-reveal><span class="walkthrough-label">Evidence</span><div class="evidence-notes"><span><b>Observed</b> Three equal-weight actions appear before proof.</span><span><b>Possible impact</b> The intended next step may be difficult to identify.</span><span><b>Boundary</b> Confirm the business priority before implementation.</span></div><h3>Name the friction precisely.</h3><p>A finding records what was seen, who it may affect, and what still needs confirmation.</p><small>Human review separates evidence from inference.</small></article>
      <article class="walkthrough-panel walkthrough-panel--after" tabindex="0" data-reveal><span class="walkthrough-label">After</span><div class="evidence-image">${picture(visualAssets.auditAfter, { alt: 'Illustrative homepage after state with one clear primary action', sizes: '(max-width: 760px) 100vw, 32vw' })}<span class="annotation-line" aria-hidden="true">One deliberate action</span></div><h3>Give the decision a hierarchy.</h3><p>The direction makes the offer, proof, and next action arrive in a deliberate order.</p><small>Direction remains subject to owner approval.</small></article>
    </div></div></section>

    <section class="section process-map-section" data-chapter="process"><div class="container-wide process-story"><div class="process-story__intro"><span class="eyebrow">The complete process</span><h2>Evidence moves in one direction.</h2><p>Each stage earns the next. Nothing becomes a claim or implementation decision merely because a tool detected it.</p><a class="text-arrow" href="/process" data-nav>Read the method ${icon('arrow')}</a></div><div class="process-story__rail"><ol class="process-map">${process}</ol></div></div></section>

    <section class="section demo-section" data-chapter="portfolio-demos"><div class="container-wide"><div class="chapter-head" data-reveal><span class="chapter-index">05 / Working demonstrations</span><div><h2>Three industries.<br>Three different jobs.</h2><p>These are complete original mini-applications—not static mockups and not client engagements.</p></div></div><div class="demo-showcase">${demos.map(demoCard).join('')}</div><a class="text-arrow demo-index-link" href="/portfolio" data-nav>Open the portfolio index ${icon('arrow')}</a></div></section>

    <section class="section finding-section" data-chapter="free-finding"><div class="container-wide finding-stage"><div class="finding-stage__intro" data-reveal><span class="eyebrow">One free finding</span><h2>Useful enough to act on. Bounded enough to trust.</h2><p>The free snapshot returns one human-reviewed observation from a normal public page. It is not a vulnerability scan, compliance certification, or automatic score.</p><a class="button button--ink" href="/free-snapshot" data-nav>Request the Free Snapshot ${icon('arrow')}</a></div><article class="finding-card" data-reveal><div class="finding-card__top"><span>Illustrative finding / F-01</span><span class="finding-status">Human review</span></div><h3>The primary action competes with the navigation.</h3><dl><div><dt>Observed</dt><dd>Three equally weighted actions appear before supporting proof.</dd></div><div><dt>Possible impact</dt><dd>A first-time visitor may not know which path starts the main task.</dd></div><div><dt>Recommendation</dt><dd>Choose one primary action and move supporting paths behind the proof sequence.</dd></div></dl><p class="finding-card__note">Illustrative structure—not a claim about a real business.</p></article></div></section>

    <section class="section pricing-story-section" data-chapter="pricing"><div class="container-wide"><div class="section-head"><div><span class="eyebrow">Four one-time tiers</span><h2>Start small. Keep verified credit.</h2></div><p>Each higher tier credits the settled, nonrefunded value already paid. No recurring AccessRevamp platform fee.</p></div><div class="upgrade-ribbon" aria-label="Cumulative upgrade credit"><strong>Cumulative upgrade credit</strong><span>$50 → $200 <b>pay $150</b></span><span>$50 → $250 <b>pay $200</b></span><span>$200 → $250 <b>pay $50</b></span></div><div class="pricing-grid">${pricing}</div></div></section>

    <section class="section deliverables-section" data-chapter="deliverables"><div class="container-wide"><div class="chapter-head chapter-head--light"><span class="chapter-index">08 / Deliverables by tier</span><div><h2>What changes<br>at each depth.</h2><p>Price is visible. Scope is written. Anything requiring owner access or a separate decision stays named.</p></div></div><div class="deliverable-ledger">${deliverables.map(([name, price, output, boundary], index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${name}</h3><strong>${price} one time</strong></div><p>${output}</p><p>${boundary}</p></article>`).join('')}</div></div></section>

    <section class="section ethics-section" data-chapter="ethics"><div class="container-wide ethics-grid"><div><span class="eyebrow">Authorized testing boundary</span><h2>Observe publicly.<br>Test actively only with permission.</h2></div><div class="ethics-rules"><article><span>We do</span><p>Review ordinary public pages, record evidence, verify claims, and keep uncertainty visible.</p></article><article><span>We do not</span><p>Probe private routes, submit prospect forms, exploit weaknesses, invent urgency, or run active tools without exact written authorization.</p></article><a class="text-arrow" href="/outreach-standards" data-nav>Read the outreach standards ${icon('arrow')}</a></div></div></section>

    <section class="section growth-section" data-chapter="growth-preview"><div class="container-wide"><div class="section-head"><div><span class="eyebrow">30-day growth preview</span><h2>A redesign needs a useful publishing rhythm.</h2></div><p>The Homepage Reveal includes an evidence-led starting plan—not a promise of reach, ranking, or revenue.</p></div><div class="growth-board"><div class="growth-board__weeks"><span>Week 01<strong>Clarify the offer</strong></span><span>Week 02<strong>Show the proof</strong></span><span>Week 03<strong>Teach the process</strong></span><span>Week 04<strong>Test the action</strong></span></div><div class="growth-board__pillars"><span>Transformation / outcome</span><span>Expertise / process</span><span>Product or service proof</span><span>Local / community story</span><span>Offer / clear action</span></div></div></div></section>

    <section class="section faq-section" data-chapter="faq"><div class="container-wide faq-layout"><div><span class="eyebrow">Straight answers</span><h2>No mystery in the fine print.</h2><p>Important service and testing boundaries belong before checkout.</p></div><div class="faq-list">${faq('Is AccessRevamp a subscription?', 'No. Every listed service is a one-time purchase with a written scope.')}${faq('Are the portfolio businesses real clients?', 'No. Each is an independent concept build and does not imply a client relationship or endorsement.')}${faq('Does the Free Snapshot test private systems?', 'No. It observes normal public-page behavior. Active testing requires exact written authorization and an owned nonproduction target.')}${faq('How does upgrade credit work?', 'A signed-in customer receives server-verified credit for settled, nonrefunded value already paid toward a higher tier.')}${faq('Is checkout live?', 'The connected catalog remains in Stripe test mode until a separate launch approval. No live charge should be created from this preview.')}</div></div></section>

    <section class="section final-cta-section" data-chapter="final-cta"><div class="container-wide final-cta"><div class="final-cta__image" data-audit-montage><div class="audit-montage"><span>${picture(visualAssets.greenlineInterface, { alt: 'Greenline website interface preview', sizes: '(max-width: 760px) 76vw, 24vw' })}</span><span>${picture(visualAssets.firejarInterface, { alt: 'Firejar product website interface preview', sizes: '(max-width: 760px) 70vw, 22vw' })}</span><span>${picture(visualAssets.clearflowInterface, { alt: 'Clearflow service website interface preview', sizes: '(max-width: 760px) 65vw, 20vw' })}</span></div><b>Three interfaces. One evidence-led method.</b></div><div><span class="eyebrow">One useful place to begin</span><h2>Bring one public website and one real goal.</h2><p>We will start with evidence, keep the boundary visible, and design the next action around what the business actually needs.</p><div class="final-cta__actions"><a class="button button--sun" href="/pricing" data-nav>Get the $50 Homepage Reveal ${icon('arrow')}</a><a class="text-arrow" href="/free-snapshot" data-nav>Or start free ${icon('arrow')}</a></div></div></div></section>
  `, { home: true, pathname: '/' });
}
