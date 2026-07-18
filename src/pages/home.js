import { plans } from '../config.js';
import { selectedWork } from '../data/portfolio.js';
import { planCard, workCard } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';

const faq = (question, answer) => `<details><summary>${question}<span>+</span></summary><p>${answer}</p></details>`;

export function homePage() {
  const work = selectedWork.map((item, index) => workCard(item, { featured: index === 0 })).join('');
  const pricing = Object.values(plans).map((plan) => planCard(plan, { featured: plan.key === 'quick_fix', compact: true })).join('');
  const ticker = Array(2).fill('<span>Human-reviewed</span><span>One-time pricing</span><span>Original direction</span><span>Accessible by design</span>').join('');

  return shell(`
    <section class="hero-editorial">
      <div class="container-wide hero-editorial__grid">
        <div class="hero-editorial__copy">
          <span class="eyebrow">Storefront design with better judgment</span>
          <h1>Make the next click feel <em>obvious.</em></h1>
          <p class="lede">AccessRevamp finds the friction, clarifies what your storefront needs to say, and turns it into a stronger visual direction—without vague retainers or invented findings.</p>
          <div class="hero-actions"><a class="button" href="/pricing" data-nav>Start a revamp ${icon('arrow')}</a><a class="button button--ghost" href="/work" data-nav>Explore the work</a></div>
          <div class="hero-notes"><span><i></i> Human-reviewed evidence</span><span><i></i> One-time scope</span><span><i></i> Stripe sandbox connected</span></div>
        </div>
        <div class="hero-board" aria-label="AccessRevamp editorial review note">
          <div class="hero-board__paper"><span class="hero-board__stamp">Clear<br/>next<br/>move</span><h2>Good design starts by deciding what matters.</h2><p>We turn a crowded first impression into a story visitors can follow and a direction you can actually use.</p><div class="hero-board__lines"><span><b>01</b> Find the friction</span><span><b>02</b> Clarify the offer</span><span><b>03</b> Build the stronger path</span></div></div>
        </div>
      </div>
    </section>
    <div class="ticker" aria-hidden="true"><div class="ticker__track">${ticker}</div></div>
    <section class="section" id="selected-work">
      <div class="container-wide">
        <div class="section-head"><div><span class="eyebrow">Selected work</span><h2>Different businesses. Distinct visual voices.</h2></div><a class="text-arrow" href="/work" data-nav>View all seven concepts ${icon('arrow')}</a></div>
        <div class="work-grid">${work}</div>
        <div class="work-disclosure"><strong>Concept-work disclosure</strong><span>Every piece shown is original, fictional concept work created for the AccessRevamp portfolio. It is not a client endorsement, live client site, or claim of a business relationship.</span></div>
      </div>
    </section>
    <section class="section story-section">
      <div class="container-wide">
        <div class="story-intro"><div><span class="eyebrow">The editorial story</span><h2>Less noise. More useful momentum.</h2></div><p>A revamp should do more than make a page prettier. It should expose what is getting in the way, make the offer easier to grasp, and build a path that feels unmistakably yours.</p></div>
        <div class="story-steps"><article class="story-step"><h3>Find the friction</h3><p>We inspect the public experience, separate evidence from assumptions, and identify the decisions slowing visitors down.</p></article><article class="story-step"><h3>Clarify the offer</h3><p>We choose the message hierarchy, proof, and primary action that deserve the strongest visual weight.</p></article><article class="story-step"><h3>Build something stronger</h3><p>We turn that judgment into a distinctive, responsive direction with a written boundary around the work.</p></article></div>
      </div>
    </section>
    <section class="section">
      <div class="container-wide"><div class="section-head"><div><span class="eyebrow">Three one-time paths</span><h2>Choose the depth, not a subscription.</h2></div><p>Every plan has a visible boundary and keeps the exact approved Stripe sandbox price.</p></div><div class="pricing-grid">${pricing}</div></div>
    </section>
    <section class="section section--tight">
      <div class="container-wide report-preview">
        <div class="report-preview__intro"><div><span class="eyebrow">Illustrative sample</span><h2>See how the thinking gets documented.</h2><p>A useful report names the evidence, explains the impact, and gives the recommendation enough context to act on.</p></div><a class="button button--ink" href="/sample-report" data-nav>See the sample report ${icon('arrow')}</a></div>
        <div class="report-preview__sheet"><span class="micro-label">Northline Goods · fictional sample</span><div class="report-finding"><span>01</span><div><h3>Primary action competes with navigation</h3><p>Several equally weighted choices make the intended product path hard to identify.</p></div><span class="severity">High</span></div><div class="report-finding"><span>02</span><div><h3>Trust arrives after the decision</h3><p>Shipping and material proof should appear nearer the first purchase action.</p></div><span class="severity">Plan</span></div><div class="report-finding"><span>03</span><div><h3>Mobile hierarchy needs a firmer edit</h3><p>The value proposition wraps into a long block before the first actionable cue.</p></div><span class="severity">Medium</span></div></div>
      </div>
    </section>
    <section class="section">
      <div class="container-wide faq-layout"><div><span class="eyebrow">Straight answers</span><h2>No mystery in the fine print.</h2><p>Important service boundaries belong before checkout.</p></div><div class="faq-list">${faq('Is AccessRevamp a subscription?', 'No. Every listed service is a one-time purchase with a written scope.')}${faq('Are the portfolio businesses real clients?', 'No. The portfolio is original, fictional concept work and does not imply a client relationship.')}${faq('Does the review probe private systems?', 'No. The initial review is passive and limited to normal public-page behavior. It is not penetration testing.')}${faq('Can I ask a question before paying?', 'Yes. Use the contact form and share only public, non-sensitive context.')}${faq('Is checkout live?', 'The currently connected Stripe catalog is in sandbox mode. No live charge is created from the test links.')}</div></div>
    </section>
    <section class="section section--tight"><div class="container-wide cta-block"><div><span class="eyebrow">Ready for a clearer first move?</span><h2>Bring one public website and one real goal.</h2><p>We will help turn the friction into a direction worth building.</p></div><a class="button button--sun" href="/pricing" data-nav>Start a revamp ${icon('arrow')}</a></div></section>
  `, { home: true, pathname: '/' });
}
