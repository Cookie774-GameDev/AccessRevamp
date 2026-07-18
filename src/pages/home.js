import { plans } from '../config.js';
import { planCard } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';

const diagnosticCategories = [
  'Accessibility', 'Usability', 'Mobile', 'Performance', 'Content', 'SEO/local discovery',
  'Conversion', 'Monetization', 'Analytics', 'Social growth', 'Security hygiene',
];

const processSteps = [
  ['01', 'Scout', 'Read the public surface and record possible friction.'],
  ['02', 'Verify', 'Separate observable evidence from inference.'],
  ['03', 'Preview', 'Shape a private, bounded direction.'],
  ['04', 'Approve', 'A human confirms claims, scope, and next action.'],
  ['05', 'Build', 'Produce only the agreed one-time deliverable.'],
  ['06', 'Measure', 'Retest the experience and document what remains.'],
];

const demos = [
  {
    href: '/portfolio/greenline-lawn-and-grounds', number: '01', name: 'Greenline Lawn & Grounds',
    type: 'Local service lead generation', action: 'Check an area and build a quote', art: 'greenline',
  },
  {
    href: '/portfolio/firejar-spicy-peanut-butter', number: '02', name: 'Firejar Spicy Peanut Butter',
    type: 'Product collection and cart', action: 'Browse heat levels and build a demo cart', art: 'firejar',
  },
  {
    href: '/portfolio/clearflow-plumbing', number: '03', name: 'Clearflow Plumbing',
    type: 'Urgent and planned service paths', action: 'Choose the right next step without panic', art: 'clearflow',
  },
];

const deliverables = [
  ['Free Snapshot', '$0', 'One human-reviewed public finding', 'A useful starting point—not an automated audit dump.'],
  ['Homepage Reveal', '$50', 'Report, redesigned landing direction, desktop/mobile PNGs, 30-day growth plan', 'Observed evidence stays separate from recommendations and concepts.'],
  ['Complete Website Revamp', '$200', 'Everything in Reveal plus an agreed implementation of up to five standard pages', 'Scope, platform access, assets, and revision boundary are written first.'],
  ['Cinematic Scroll Site', '$250', 'Everything in Complete plus one four-beat cinematic narrative', 'Includes mobile, static, media-failure, and reduced-motion fallbacks.'],
];

const faq = (question, answer) => `<details><summary>${question}<span aria-hidden="true">+</span></summary><p>${answer}</p></details>`;

const demoCard = (demo) => `<article class="demo-card demo-card--${demo.art}">
  <a class="demo-card__visual" href="${demo.href}" data-nav aria-label="Open ${demo.name} working demo">
    <span class="demo-card__number">${demo.number}</span><span class="demo-card__mark" aria-hidden="true"></span>
    <span class="demo-card__action">${demo.action}</span>
  </a>
  <div class="demo-card__copy"><span class="micro-label">${demo.type}</span><h3><a href="${demo.href}" data-nav>${demo.name}</a></h3><p>Original working demo — not a client engagement.</p></div>
</article>`;

export function homePage() {
  const pricing = Object.values(plans).map((plan) => planCard(plan, { featured: plan.key === 'complete_revamp', compact: true })).join('');
  const spectrum = diagnosticCategories.map((category, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span>${category}</li>`).join('');
  const process = processSteps.map(([number, title, copy]) => `<li><span>${number}</span><strong>${title}</strong><p>${copy}</p></li>`).join('');

  return shell(`
    <section class="home-audit-hero" data-chapter="audit-lens">
      <div class="container-wide home-audit-hero__grid">
        <div class="home-audit-hero__copy">
          <span class="eyebrow">Evidence-led website revamps</span>
          <h1>Your website is already telling us <em>where customers get stuck.</em></h1>
          <p class="lede">AccessRevamp verifies the friction, redesigns the next step, and gives you a one-time path from evidence to a better site.</p>
          <div class="hero-actions"><a class="button" href="/pricing" data-nav>Get the $50 Homepage Reveal ${icon('arrow')}</a><a class="text-arrow hero-proof-link" href="/sample-report" data-nav>See a verified example ${icon('arrow')}</a></div>
          <p class="hero-boundary"><span>Public pages only</span><span>Human-reviewed</span><span>No invented outcomes</span></p>
        </div>
        <figure class="audit-lens">
          <div class="audit-lens__top"><span>Live diagnostic composition</span><span>Public surface / 01</span></div>
          <div class="audit-lens__field" aria-hidden="true">
            <span class="audit-ring audit-ring--one"></span><span class="audit-ring audit-ring--two"></span><span class="audit-ring audit-ring--three"></span>
            <span class="audit-signal audit-signal--a">Mobile hierarchy<i>Signal</i></span>
            <span class="audit-signal audit-signal--b">Primary action<i>Evidence</i></span>
            <span class="audit-signal audit-signal--c">Offer clarity<i>Verify</i></span>
            <span class="audit-lens__core">One clear<br/>next action</span>
          </div>
          <ol class="audit-lens__rail"><li class="is-active"><span>01</span>Signals</li><li><span>02</span>Evidence</li><li><span>03</span>Direction</li></ol>
          <figcaption>Scattered public signals become verified evidence, then a clearer customer path.</figcaption>
        </figure>
      </div>
    </section>

    <section class="trust-rail" aria-label="Service principles" data-chapter="trust"><div class="container-wide trust-rail__grid"><span>Passive review</span><span>Evidence before claims</span><span>Human review</span><span>One-time pricing</span></div></section>

    <section class="section spectrum-section" data-chapter="diagnostic-spectrum"><div class="container-wide"><div class="chapter-head"><span class="chapter-index">02 / Diagnostic spectrum</span><div><h2>One website.<br/>Eleven useful lenses.</h2><p>We look across the customer experience without pretending every signal is a confirmed problem. Automation can point; a person must verify.</p></div></div><ol class="spectrum-index">${spectrum}</ol></div></section>

    <section class="section walkthrough-section" data-chapter="before-evidence-after"><div class="container-wide"><div class="chapter-head chapter-head--light"><span class="chapter-index">03 / Evidence walkthrough</span><div><h2>Do not jump<br/>from before to after.</h2><p>The middle step—evidence—is where design earns the right to change something.</p></div></div><div class="evidence-walkthrough">
      <article class="walkthrough-panel walkthrough-panel--before"><span class="walkthrough-label">Before</span><div class="interface-sketch interface-sketch--before"><i></i><i></i><i></i><b></b><b></b><b></b></div><h3>Everything asks for attention.</h3><p>Navigation, offer, proof, and three actions compete at the same visual volume.</p></article>
      <article class="walkthrough-panel walkthrough-panel--evidence"><span class="walkthrough-label">Evidence</span><div class="evidence-notes"><span><b>Observed</b> Three equal-weight actions appear before proof.</span><span><b>Impact</b> The intended next step is difficult to identify.</span><span><b>Boundary</b> Confirm with the owner before implementation.</span></div><h3>Name the friction precisely.</h3><p>A finding records what was seen, who it may affect, and what still needs confirmation.</p></article>
      <article class="walkthrough-panel walkthrough-panel--after"><span class="walkthrough-label">After</span><div class="interface-sketch interface-sketch--after"><i></i><strong>One clear offer.</strong><b></b><button type="button" tabindex="-1">Primary action</button></div><h3>Give the decision a hierarchy.</h3><p>The redesign makes the offer, proof, and next action arrive in a deliberate order.</p></article>
    </div></div></section>

    <section class="section process-map-section" data-chapter="process"><div class="container-wide"><div class="section-head"><div><span class="eyebrow">The complete process</span><h2>Scout → Verify → Preview → Approve → Build → Measure.</h2></div><a class="text-arrow" href="/process" data-nav>Read the method ${icon('arrow')}</a></div><ol class="process-map">${process}</ol></div></section>

    <section class="section demo-section" data-chapter="portfolio-demos"><div class="container-wide"><div class="chapter-head"><span class="chapter-index">05 / Working demonstrations</span><div><h2>Three industries.<br/>Three different jobs.</h2><p>Each route is an original mini-application designed around a real business task—not a reskinned template.</p></div></div><div class="demo-showcase">${demos.map(demoCard).join('')}</div><a class="text-arrow demo-index-link" href="/portfolio" data-nav>Open the portfolio index ${icon('arrow')}</a></div></section>

    <section class="section finding-section" data-chapter="free-finding"><div class="container-wide finding-stage"><div class="finding-stage__intro"><span class="eyebrow">One free finding</span><h2>Useful enough to act on. Bounded enough to trust.</h2><p>The free snapshot returns one human-reviewed observation from a normal public page. It is not a vulnerability scan, compliance certification, or automatic score.</p><a class="button button--ink" href="/free-snapshot" data-nav>Request the Free Snapshot ${icon('arrow')}</a></div><article class="finding-card"><div class="finding-card__top"><span>Illustrative finding / F-01</span><span class="finding-status">Human review</span></div><h3>The primary action competes with the navigation.</h3><dl><div><dt>Observed</dt><dd>Three equally weighted actions appear before supporting proof.</dd></div><div><dt>Possible impact</dt><dd>A first-time visitor may not know which path starts the main task.</dd></div><div><dt>Recommendation</dt><dd>Choose one primary action and move supporting paths behind the proof sequence.</dd></div></dl><p class="finding-card__note">Illustrative structure—not a claim about a real business.</p></article></div></section>

    <section class="section pricing-story-section" data-chapter="pricing"><div class="container-wide"><div class="section-head"><div><span class="eyebrow">Four one-time tiers</span><h2>Start small. Keep verified credit.</h2></div><p>Each higher tier credits the settled, nonrefunded value already paid. No recurring AccessRevamp platform fee.</p></div><div class="upgrade-ribbon" aria-label="Cumulative upgrade credit"><strong>Cumulative upgrade credit</strong><span>$50 → $200 <b>pay $150</b></span><span>$50 → $250 <b>pay $200</b></span><span>$200 → $250 <b>pay $50</b></span></div><div class="pricing-grid">${pricing}</div></div></section>

    <section class="section deliverables-section" data-chapter="deliverables"><div class="container-wide"><div class="chapter-head chapter-head--light"><span class="chapter-index">08 / Deliverables by tier</span><div><h2>What changes<br/>at each depth.</h2><p>Price is visible. Scope is written. Anything requiring owner access or a separate decision stays named.</p></div></div><div class="deliverable-ledger">${deliverables.map(([name, price, output, boundary], index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${name}</h3><strong>${price} one time</strong></div><p>${output}</p><p>${boundary}</p></article>`).join('')}</div></div></section>

    <section class="section ethics-section" data-chapter="ethics"><div class="container-wide ethics-grid"><div><span class="eyebrow">Authorized testing boundary</span><h2>Observe publicly.<br/>Test actively only with permission.</h2></div><div class="ethics-rules"><article><span>We do</span><p>Review ordinary public pages, record evidence, verify claims, and keep uncertainty visible.</p></article><article><span>We do not</span><p>Probe private routes, submit prospect forms, exploit weaknesses, invent urgency, or run active tools without exact written authorization.</p></article><a class="text-arrow" href="/outreach-standards" data-nav>Read the outreach standards ${icon('arrow')}</a></div></div></section>

    <section class="section growth-section" data-chapter="growth-preview"><div class="container-wide"><div class="section-head"><div><span class="eyebrow">30-day growth preview</span><h2>A redesign needs a useful publishing rhythm.</h2></div><p>The Homepage Reveal includes an evidence-led starting plan—not a promise of reach, ranking, or revenue.</p></div><div class="growth-board"><div class="growth-board__weeks"><span>Week 01<strong>Clarify the offer</strong></span><span>Week 02<strong>Show the proof</strong></span><span>Week 03<strong>Teach the process</strong></span><span>Week 04<strong>Test the action</strong></span></div><div class="growth-board__pillars"><span>Transformation / outcome</span><span>Expertise / process</span><span>Product or service proof</span><span>Local / community story</span><span>Offer / clear action</span></div></div></div></section>

    <section class="section faq-section" data-chapter="faq"><div class="container-wide faq-layout"><div><span class="eyebrow">Straight answers</span><h2>No mystery in the fine print.</h2><p>Important service and testing boundaries belong before checkout.</p></div><div class="faq-list">${faq('Is AccessRevamp a subscription?', 'No. Every listed service is a one-time purchase with a written scope.')}${faq('Are the portfolio businesses real clients?', 'No. Each is an original working demonstration and does not imply a client relationship or endorsement.')}${faq('Does the Free Snapshot test private systems?', 'No. It observes normal public-page behavior. Active testing requires exact written authorization and an owned nonproduction target.')}${faq('How does upgrade credit work?', 'A signed-in customer receives server-verified credit for settled, nonrefunded value already paid toward a higher tier.')}${faq('Is checkout live?', 'The connected catalog remains in Stripe test mode until a separate launch approval. No live charge should be created from this preview.')}</div></div></section>

    <section class="section final-cta-section" data-chapter="final-cta"><div class="container-wide final-cta"><div><span class="eyebrow">One useful place to begin</span><h2>Bring one public website and one real goal.</h2><p>We will start with evidence, keep the boundary visible, and design the next action around what the business actually needs.</p></div><div><a class="button button--sun" href="/pricing" data-nav>Get the $50 Homepage Reveal ${icon('arrow')}</a><a class="text-arrow" href="/free-snapshot" data-nav>Or start free ${icon('arrow')}</a></div></div></section>
  `, { home: true, pathname: '/' });
}
