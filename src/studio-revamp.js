import './studio-revamp.css';
import { plans } from './config.js';

const app = document.querySelector('#app');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const originalDirections = Object.freeze([
  {
    id: 'atelier-noir',
    title: 'Atelier Noir',
    category: 'Editorial commerce',
    description: 'Oversized typography, product-led storytelling, and a disciplined purchase path for fashion, home, or luxury goods.',
    image: '/reference-designs/editorial-commerce.svg',
    alt: 'Original AccessRevamp editorial commerce homepage concept titled Atelier Noir',
    tags: ['Editorial type', 'Product focus', 'High contrast'],
  },
  {
    id: 'stillpoint',
    title: 'Stillpoint House',
    category: 'Wellness & booking',
    description: 'A soft, art-directed service site that makes the offer, schedule, trust signals, and first booking action immediately clear.',
    image: '/reference-designs/wellness-studio.svg',
    alt: 'Original AccessRevamp wellness and booking website concept titled Stillpoint House',
    tags: ['Calm pacing', 'Booking flow', 'Accessible type'],
  },
  {
    id: 'nocturne',
    title: 'Nocturne Hotel',
    category: 'Hospitality',
    description: 'A cinematic hospitality direction with atmospheric imagery, concise room storytelling, and a persistent reservation path.',
    image: '/reference-designs/hospitality-noir.svg',
    alt: 'Original AccessRevamp dark hospitality website concept titled Nocturne Hotel',
    tags: ['Cinematic mood', 'Reservations', 'Local story'],
  },
  {
    id: 'field-system',
    title: 'Field System',
    category: 'SaaS & platform',
    description: 'A structured product-marketing direction that turns a complex platform into one promise, one proof system, and one next step.',
    image: '/reference-designs/saas-library.svg',
    alt: 'Original AccessRevamp software platform website concept titled Field System',
    tags: ['Modular UI', 'Clear proof', 'Product education'],
  },
  {
    id: 'common-ground',
    title: 'Common Ground',
    category: 'Culture & community',
    description: 'A warm editorial system for venues, nonprofits, and community brands that need programs, stories, and participation to coexist.',
    image: '/reference-designs/cultural-journal.svg',
    alt: 'Original AccessRevamp culture and community website concept titled Common Ground',
    tags: ['Story archive', 'Event discovery', 'Human voice'],
  },
  {
    id: 'monolith-one',
    title: 'Monolith One',
    category: 'Cinematic product launch',
    description: 'A scroll-directed product reveal with restrained copy, tactile lighting, and a lightweight motion fallback for smaller screens.',
    image: '/reference-designs/cinematic-product.svg',
    alt: 'Original AccessRevamp cinematic product launch website concept titled Monolith One',
    tags: ['Scroll direction', 'Product reveal', 'Motion fallback'],
  },
]);

const designReferences = Object.freeze([
  {
    index: '01',
    title: 'Mattis Studio',
    category: 'Editorial studio direction',
    note: 'Useful reference for oversized type, monochrome imagery, visible layout grids, and a decisive orange accent.',
    url: 'https://mattis.framer.website/',
  },
  {
    index: '02',
    title: 'shadcnblocks',
    category: 'Component-system direction',
    note: 'Useful reference for structured interface patterns, reusable sections, and fast assembly of polished product pages.',
    url: 'https://www.shadcnblocks.com/?utm_source=landbook&utm_medium=ad&utm_campaign=shadcnblocks',
  },
  {
    index: '03',
    title: 'Locomotive',
    category: 'Digital agency direction',
    note: 'Useful reference for bold project framing, confident art direction, and movement that supports the story instead of obscuring it.',
    url: 'https://locomotive.ca/en',
  },
  {
    index: '04',
    title: 'Unseen Studio',
    category: 'Experimental brand direction',
    note: 'Useful reference for expressive interaction, motion-led identity, and a portfolio experience that feels authored rather than templated.',
    url: 'https://unseen.co/',
  },
]);

const cinematicReferences = Object.freeze([
  {
    index: 'M01',
    title: 'Lusion',
    category: 'Interactive 3D studio',
    note: 'Reference for scene-based web storytelling and real-time visual depth.',
    url: 'https://lusion.co/',
  },
  {
    index: 'M02',
    title: 'Organimo',
    category: 'Immersive product direction',
    note: 'Reference for dramatic lighting, sculptural product presentation, and scroll-paced reveals.',
    url: 'https://organimo.com/',
  },
  {
    index: 'M03',
    title: 'Unseen Studio',
    category: 'Motion-led digital identity',
    note: 'Reference for mixing interaction, typography, and brand motion into one coherent system.',
    url: 'https://unseen.co/',
  },
]);

const arrow = () => '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M8 5h7v7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function internalLink(href, label, className = '') {
  return `<a class="${className}" href="${href}" data-studio-nav>${label}</a>`;
}

function disclosure(kind = 'references') {
  const text = kind === 'originals'
    ? 'Original concept-work disclosure: These fictional design directions were created by AccessRevamp to demonstrate styles we can build. They are not client projects, testimonials, live businesses, or claims of measured results.'
    : 'External-reference disclosure: The linked websites are not AccessRevamp work, are not our clients, and do not imply affiliation, endorsement, permission, or a business relationship. They are credited and linked only to communicate possible design directions. We would create an original solution—not copy their protected work.';
  return `<aside class="studio-disclosure" aria-label="${kind === 'originals' ? 'Original concept disclosure' : 'External reference disclosure'}"><span>${kind === 'originals' ? 'ORIGINAL CONCEPTS' : 'EXTERNAL REFERENCES'}</span><p>${text}</p></aside>`;
}

function directionCard(item, index) {
  return `
    <article class="studio-direction-card reveal-on-scroll">
      <a class="studio-direction-card__visual" href="/contact?direction=${item.id}" data-studio-nav aria-label="Discuss the ${item.title} design direction">
        <img src="${item.image}" alt="${item.alt}" loading="lazy" decoding="async">
        <span class="studio-direction-card__number">${String(index + 1).padStart(2, '0')}</span>
      </a>
      <div class="studio-direction-card__body">
        <div><span class="studio-overline">${item.category}</span><h3>${item.title}</h3></div>
        <p>${item.description}</p>
        <div class="studio-tag-row">${item.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
      </div>
    </article>`;
}

function referenceRow(item) {
  return `
    <article class="studio-reference-row reveal-on-scroll">
      <span class="studio-reference-row__index">${item.index}</span>
      <div><span class="studio-overline">${item.category}</span><h3>${item.title}</h3><p>${item.note}</p></div>
      <a href="${item.url}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${item.title} in a new tab">
        <span class="studio-reference-row__url">${item.url}</span>${arrow()}
      </a>
    </article>`;
}

function capabilityCard(number, title, text, detail) {
  return `<article class="studio-capability reveal-on-scroll"><span>${number}</span><div><h3>${title}</h3><p>${text}</p><small>${detail}</small></div></article>`;
}

function studioHome() {
  const reveal = plans.homepage_reveal;
  const quick = plans.quick_fix;
  const cinematic = plans.cinematic_scroll;

  return `
    <div class="studio-home" data-studio-home>
      <section class="studio-hero" data-portfolio-home data-cinematic-home-feature>
        <div class="studio-hero__gridline studio-hero__gridline--one" aria-hidden="true"></div>
        <div class="studio-hero__gridline studio-hero__gridline--two" aria-hidden="true"></div>
        <div class="studio-shell studio-hero__layout">
          <div class="studio-hero__copy">
            <span class="studio-kicker"><i></i>ACCESSREVAMP / DIGITAL REMEDIATION STUDIO</span>
            <h1>We sculpt<br><em>the next click.</em></h1>
            <p>Strategy, accessibility, design, and engineering shaped into one clear web experience. We do not decorate around confusion—we remove it.</p>
            <div class="studio-hero__actions">
              ${internalLink('/portfolio', `Websites we can build ${arrow()}`, 'studio-button studio-button--dark')}
              ${internalLink('/pricing', 'View one-time plans', 'studio-button studio-button--line')}
            </div>
            <div class="studio-proofline" aria-label="AccessRevamp service principles"><span>Human-reviewed</span><span>Responsive by default</span><span>No subscription</span></div>
          </div>
          <div class="studio-hero__art" data-studio-parallax>
            <div class="studio-hero__halo" aria-hidden="true"></div>
            <img src="/reference-designs/accessrevamp-muse.svg" alt="Original AccessRevamp marble muse illustration representing clarity shaped from complexity" fetchpriority="high">
            <span class="studio-art-label studio-art-label--one"><b>01</b> CLARITY</span>
            <span class="studio-art-label studio-art-label--two"><b>02</b> ACCESS</span>
            <span class="studio-art-label studio-art-label--three"><b>03</b> MOTION</span>
            <span class="studio-art-caption">THE MUSE / STUDY 01<br>ORIGINAL ACCESSREVAMP ARTWORK</span>
          </div>
        </div>
        <div class="studio-hero__footer studio-shell"><span>OPEN FOR SELECT PROJECTS</span><span>WEB / COMMERCE / MOTION</span><span>EST. 2026</span></div>
      </section>

      <section class="studio-manifesto">
        <div class="studio-shell studio-manifesto__grid">
          <div><span>OUR POSITION</span><p>People decide whether to trust a site before they read every word. Hierarchy, speed, contrast, language, and interaction all make that decision together.</p></div>
          <h2>STRATEGY<br>BEFORE<br>PIXELS.</h2>
          <div class="studio-manifesto__figure"><img src="/reference-designs/accessrevamp-muse.svg" alt="" aria-hidden="true"><span>MAKE THE NEXT STEP FEEL INEVITABLE.</span></div>
        </div>
      </section>

      <section class="studio-section studio-section--paper" id="capabilities">
        <div class="studio-shell">
          <header class="studio-section-heading reveal-on-scroll"><div><span class="studio-kicker studio-kicker--dark"><i></i>WHAT WE ACTUALLY IMPROVE</span><h2>A website is a system of decisions.</h2></div><p>We coordinate the parts visitors feel at once—message, movement, accessibility, proof, and action—then build the cleanest version that supports the business.</p></header>
          <div class="studio-capability-grid">
            ${capabilityCard('01', 'Message hierarchy', 'One clear promise, supporting proof, and a primary action that survives a five-second scan.', 'POSITIONING / COPY / CTA')}
            ${capabilityCard('02', 'Accessible interaction', 'Readable contrast, keyboard-safe controls, sensible landmarks, focus states, and reduced-motion fallbacks.', 'WCAG-AWARE / HUMAN REVIEW')}
            ${capabilityCard('03', 'Responsive composition', 'Layouts designed for the thumb, the laptop, the large display, and the spaces between—not shrunk after desktop.', 'MOBILE / TABLET / DESKTOP')}
            ${capabilityCard('04', 'Performance direction', 'Fewer decorative dependencies, disciplined media, stable layout, and motion that earns its rendering cost.', 'SPEED / STABILITY / MEDIA')}
            ${capabilityCard('05', 'Conversion architecture', 'Offers, pricing, proof, objections, and contact paths placed in the order a real buyer needs them.', 'JOURNEY / TRUST / ACTION')}
            ${capabilityCard('06', 'A distinct visual language', 'A repeatable system of type, image, spacing, color, and motion that belongs to the brand—not a template marketplace.', 'IDENTITY / SYSTEM / DETAIL')}
          </div>
        </div>
      </section>

      <section class="studio-section studio-section--ink" id="websites-we-can-build">
        <div class="studio-shell">
          <header class="studio-section-heading studio-section-heading--light reveal-on-scroll"><div><span class="studio-kicker"><i></i>WEBSITES WE CAN BUILD</span><h2>Original directions.<br>Different kinds of energy.</h2></div><p>These fictional concepts show the breadth of systems we can create—from quiet editorial commerce to high-motion product storytelling.</p></header>
          <div class="studio-direction-grid">${originalDirections.map(directionCard).join('')}</div>
          ${disclosure('originals')}
          <div class="studio-section-link">${internalLink('/portfolio', `Explore every design direction ${arrow()}`, 'studio-text-link')}</div>
        </div>
      </section>

      <section class="studio-section studio-section--paper studio-reference-section">
        <div class="studio-shell">
          <header class="studio-section-heading reveal-on-scroll"><div><span class="studio-kicker studio-kicker--dark"><i></i>REFERENCE DESIGNS</span><h2>What “premium” can mean.</h2></div><p>Not a claim of authorship. A transparent visual vocabulary for discussing pacing, structure, interaction, and finish before a custom direction begins.</p></header>
          <div class="studio-reference-list">${designReferences.map(referenceRow).join('')}</div>
          ${disclosure('references')}
        </div>
      </section>

      <section class="studio-section studio-section--coral studio-motion-preview">
        <div class="studio-shell">
          <header class="studio-section-heading reveal-on-scroll"><div><span class="studio-kicker studio-kicker--dark"><i></i>CINEMATIC SCROLL DIRECTIONS</span><h2>Let the visitor direct the scene.</h2></div><p>Scroll can behave like a playhead: revealing an object, moving through a space, or sequencing a story while the copy remains real, readable HTML.</p></header>
          <div class="studio-motion-grid">
            <article class="studio-motion-card reveal-on-scroll"><img src="/reference-designs/cinematic-sculpture.svg" alt="Original AccessRevamp cinematic scroll concept featuring an abstract marble sculpture" loading="lazy"><div><span class="studio-overline">ORIGINAL MOTION DIRECTION / 01</span><h3>Sculpture in signal</h3><p>A museum-like reveal where light, depth, and copy advance at the visitor’s pace.</p></div></article>
            <article class="studio-motion-card reveal-on-scroll"><img src="/reference-designs/cinematic-product.svg" alt="Original AccessRevamp cinematic scroll concept featuring a luminous product monolith" loading="lazy"><div><span class="studio-overline">ORIGINAL MOTION DIRECTION / 02</span><h3>Monolith One</h3><p>A product launch that earns the final call to action through four controlled story beats.</p></div></article>
          </div>
          <div class="studio-motion-reference-strip">${cinematicReferences.map((item) => `<a href="${item.url}" target="_blank" rel="noopener noreferrer"><span>${item.index}</span><b>${item.title}</b><small>${item.category}</small>${arrow()}</a>`).join('')}</div>
          ${disclosure('references')}
          <div class="studio-section-link">${internalLink('/cinematic-scroll', `Experience our interactive demo ${arrow()}`, 'studio-text-link studio-text-link--dark')}</div>
        </div>
      </section>

      <section class="studio-section studio-section--paper studio-process">
        <div class="studio-shell">
          <header class="studio-section-heading reveal-on-scroll"><div><span class="studio-kicker studio-kicker--dark"><i></i>FROM FRICTION TO FORM</span><h2>A deliberate four-part build.</h2></div><p>Every project begins by narrowing the decision, not widening the mood board.</p></header>
          <ol class="studio-process-list">
            <li class="reveal-on-scroll"><span>01</span><div><h3>Read the current experience</h3><p>We review the public site, offer, audience, content, interaction, and known business constraints.</p></div><small>OBSERVE</small></li>
            <li class="reveal-on-scroll"><span>02</span><div><h3>Choose the design thesis</h3><p>We define the promise, visual tension, proof order, primary action, and accessibility boundaries.</p></div><small>DIRECT</small></li>
            <li class="reveal-on-scroll"><span>03</span><div><h3>Build the responsive system</h3><p>Approved direction becomes reusable components, real content, interaction states, and tested fallbacks.</p></div><small>SCULPT</small></li>
            <li class="reveal-on-scroll"><span>04</span><div><h3>Review what ships</h3><p>We check the agreed scope across screen sizes and document the remaining boundaries before handoff.</p></div><small>REFINE</small></li>
          </ol>
        </div>
      </section>

      <section class="studio-section studio-section--ink studio-plan-preview">
        <div class="studio-shell">
          <header class="studio-section-heading studio-section-heading--light reveal-on-scroll"><div><span class="studio-kicker"><i></i>ONE-TIME WAYS TO START</span><h2>Choose the depth,<br>not a subscription.</h2></div><p>Start with a reviewed direction, move into an agreed full revamp, or commission one focused cinematic page.</p></header>
          <div class="studio-plan-grid">
            <article><span>01 / DIRECTION</span><h3>${reveal.name}</h3><strong>${reveal.displayPrice}</strong><p>Reviewed homepage observations, evidence, priorities, and a complete first-screen design direction.</p>${internalLink('/pricing', 'See exact scope', 'studio-text-link')}</article>
            <article><span>02 / BUILD</span><h3>${quick.name}</h3><strong>${quick.displayPrice}</strong><p>An agreed website revamp plus documented findings, growth recommendations, and a bounded creative pack.</p>${internalLink('/pricing', 'See exact scope', 'studio-text-link')}</article>
            <article><span>03 / MOTION</span><h3>${cinematic.name}</h3><strong>${cinematic.displayPrice}</strong><p>One responsive motion microsite with one scroll-directed sequence, mobile and reduced-motion fallbacks.</p>${internalLink('/cinematic-scroll', 'See the motion plan', 'studio-text-link')}</article>
          </div>
          <p class="studio-plan-note">Prices shown are the current one-time AccessRevamp catalog. Exact implementation scope, access, content, delivery, and exclusions are confirmed in writing before work begins.</p>
        </div>
      </section>

      <section class="studio-final-cta">
        <div class="studio-shell"><span>THE NEXT VERSION SHOULD FEEL INTENTIONAL.</span><h2>Bring us the site.<br>We’ll find the form.</h2><div>${internalLink('/contact', `Start a project ${arrow()}`, 'studio-button studio-button--dark')}${internalLink('/sample-report', 'See how we review', 'studio-button studio-button--line')}</div></div>
      </section>
    </div>`;
}

function referencePage() {
  return `
    <div class="studio-reference-page" data-cinematic-portfolio-section>
      <section class="studio-reference-hero">
        <div class="studio-shell">
          <span class="studio-kicker"><i></i>WEBSITES WE CAN BUILD</span>
          <h1>Design directions,<br><em>not borrowed credit.</em></h1>
          <div class="studio-reference-hero__bottom"><p>Original AccessRevamp concepts sit beside clearly credited external references so you can describe the level of pacing, composition, and interaction you want—without pretending someone else’s work is ours.</p><span>06 ORIGINAL DIRECTIONS<br>07 CREDITED REFERENCES</span></div>
        </div>
      </section>

      <section class="studio-section studio-section--paper">
        <div class="studio-shell">
          <header class="studio-section-heading reveal-on-scroll"><div><span class="studio-kicker studio-kicker--dark"><i></i>STYLES WE CAN CREATE</span><h2>Six original starting points.</h2></div><p>Each direction is a fictional art-direction study. A real project would be adapted to the business, audience, content, platform, and accessibility needs.</p></header>
          <div class="studio-direction-grid studio-direction-grid--reference">${originalDirections.map(directionCard).join('')}</div>
          ${disclosure('originals')}
        </div>
      </section>

      <section class="studio-section studio-section--ink studio-reference-section">
        <div class="studio-shell">
          <header class="studio-section-heading studio-section-heading--light reveal-on-scroll"><div><span class="studio-kicker"><i></i>DESIGN INSPIRATION</span><h2>Credited sites worth discussing.</h2></div><p>Open each source, note what feels right, and tell us why. We will translate the principle into an original AccessRevamp system.</p></header>
          <div class="studio-reference-list studio-reference-list--dark">${designReferences.map(referenceRow).join('')}</div>
          ${disclosure('references')}
        </div>
      </section>

      <section class="studio-section studio-section--coral">
        <div class="studio-shell">
          <header class="studio-section-heading reveal-on-scroll"><div><span class="studio-kicker studio-kicker--dark"><i></i>EXAMPLE MOTION DIRECTIONS</span><h2>Cinematic scroll references.</h2></div><p>These links demonstrate the category of interaction—not a promise to reproduce another studio’s execution, assets, code, or brand.</p></header>
          <div class="studio-motion-grid">
            <article class="studio-motion-card reveal-on-scroll"><img src="/reference-designs/cinematic-sculpture.svg" alt="Original AccessRevamp cinematic sculpture website concept" loading="lazy"><div><span class="studio-overline">ORIGINAL / FICTIONAL</span><h3>Sculpture in signal</h3><p>Monochrome material, directional light, and four scroll-paced chapters.</p></div></article>
            <article class="studio-motion-card reveal-on-scroll"><img src="/reference-designs/cinematic-product.svg" alt="Original AccessRevamp cinematic product website concept" loading="lazy"><div><span class="studio-overline">ORIGINAL / FICTIONAL</span><h3>Monolith One</h3><p>A precise product reveal with accessible copy and a lighter mobile path.</p></div></article>
          </div>
          <div class="studio-reference-list studio-reference-list--coral">${cinematicReferences.map(referenceRow).join('')}</div>
          ${disclosure('references')}
          <div class="studio-section-link">${internalLink('/cinematic-scroll', `Open the AccessRevamp motion demo ${arrow()}`, 'studio-text-link studio-text-link--dark')}</div>
        </div>
      </section>

      <section class="studio-final-cta studio-final-cta--paper"><div class="studio-shell"><span>REFERENCE IS THE BEGINNING, NOT THE DELIVERABLE.</span><h2>Choose a direction.<br>Then make it yours.</h2><div>${internalLink('/contact', `Discuss a project ${arrow()}`, 'studio-button studio-button--dark')}${internalLink('/pricing', 'View one-time plans', 'studio-button studio-button--line')}</div></div></section>
    </div>`;
}

function cinematicReferenceSection() {
  return `
    <section class="studio-section studio-section--paper studio-cinematic-references" data-studio-cinematic-references>
      <div class="studio-shell">
        <header class="studio-section-heading reveal-on-scroll"><div><span class="studio-kicker studio-kicker--dark"><i></i>REFERENCE MOTION EXPERIENCES</span><h2>Motion vocabulary,<br>with the source attached.</h2></div><p>These independent websites are linked as inspiration only. The AccessRevamp demo above is original; a paid project would receive its own concept, assets, copy, and implementation.</p></header>
        <div class="studio-reference-list">${cinematicReferences.map(referenceRow).join('')}</div>
        ${disclosure('references')}
      </div>
    </section>`;
}

function decorateShell() {
  document.body.classList.add('studio-revamp');

  document.querySelectorAll('.brand').forEach((brand) => {
    const mark = brand.querySelector('.brand-mark');
    const name = mark?.nextElementSibling;
    if (mark) mark.textContent = 'A/R';
    if (name && name.textContent !== 'AccessRevamp / Studio') name.textContent = 'AccessRevamp / Studio';
  });

  document.querySelectorAll('a[href="/portfolio"]').forEach((link) => {
    if (!link.closest('.studio-home, .studio-reference-page')) link.textContent = 'Websites We Can Build';
  });
  document.querySelectorAll('.desktop-nav a[href="/cinematic-scroll"]').forEach((link) => { link.textContent = 'Cinematic'; });
  document.querySelectorAll('.mobile-nav a[href="/cinematic-scroll"]').forEach((link) => { link.textContent = 'Cinematic Scroll'; });
  document.querySelectorAll('.desktop-nav a[href="/methodology"]').forEach((link) => { link.textContent = 'Process'; });

  const headerAction = document.querySelector('.site-header .nav-actions .button');
  if (headerAction) headerAction.textContent = 'Start a project';

  const footerIntro = document.querySelector('.site-footer .footer-grid > div:first-child p');
  if (footerIntro) footerIntro.textContent = 'Strategy, accessibility, design, and engineering—shaped into one clear next step.';

  const footerBottom = document.querySelector('.site-footer .footer-bottom span:last-child');
  if (footerBottom) footerBottom.textContent = 'Original work. Credited references. Clear boundaries.';
}

function updateMeta(title, description) {
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
}

function setupReveal() {
  const elements = [...document.querySelectorAll('.reveal-on-scroll:not([data-reveal-ready])')];
  if (!elements.length) return;
  elements.forEach((element) => { element.dataset.revealReady = 'true'; });

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
  elements.forEach((element) => observer.observe(element));
}

function setupParallax() {
  const art = document.querySelector('[data-studio-parallax]:not([data-parallax-ready])');
  if (!art || reducedMotion.matches) return;
  art.dataset.parallaxReady = 'true';
  const onMove = (event) => {
    const rect = art.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    art.style.setProperty('--parallax-x', `${(x * 9).toFixed(2)}px`);
    art.style.setProperty('--parallax-y', `${(y * 7).toFixed(2)}px`);
  };
  const reset = () => {
    art.style.setProperty('--parallax-x', '0px');
    art.style.setProperty('--parallax-y', '0px');
  };
  art.addEventListener('pointermove', onMove);
  art.addEventListener('pointerleave', reset);
}

let applying = false;
function applyStudioExperience() {
  if (applying) return;
  applying = true;
  requestAnimationFrame(() => {
    try {
      decorateShell();
      const main = document.querySelector('#main-content');
      if (!main) return;

      if (location.pathname === '/') {
        if (main.dataset.studioRendered !== 'home') {
          main.dataset.studioRendered = 'home';
          main.innerHTML = studioHome();
        }
        updateMeta('AccessRevamp — We sculpt the next click', 'AccessRevamp is a digital remediation and web design studio creating clear, accessible, conversion-aware websites, original design directions, and cinematic scroll experiences.');
      } else if (location.pathname === '/portfolio') {
        if (main.dataset.studioRendered !== 'reference') {
          main.dataset.studioRendered = 'reference';
          main.dataset.portfolioRendered = 'true';
          main.innerHTML = referencePage();
        }
        updateMeta('Websites We Can Build | AccessRevamp', 'Explore original AccessRevamp website concepts and clearly credited external reference designs, with direct links and transparent authorship disclosures.');
      } else if (location.pathname === '/cinematic-scroll') {
        if (!main.querySelector('[data-cinematic-stage]')) {
          delete main.dataset.cinematicRoute;
          main.append(document.createComment('reset cinematic route'));
        } else if (!main.querySelector('[data-studio-cinematic-references]')) {
          const scope = main.querySelector('.cinematic-scope');
          (scope || main.lastElementChild)?.insertAdjacentHTML('beforebegin', cinematicReferenceSection());
        }
      } else if (location.pathname === '/refunds' && !main.querySelector('.refund-policy')) {
        delete main.dataset.cinematicRoute;
        main.append(document.createComment('reset refunds route'));
      } else if (location.pathname === '/legal' && !main.querySelector('.legal-hub-grid')) {
        delete main.dataset.cinematicRoute;
        main.append(document.createComment('reset legal route'));
      }

      setupReveal();
      setupParallax();
    } finally {
      applying = false;
    }
  });
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-studio-nav]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const url = new URL(link.href, location.origin);
  if (url.origin !== location.origin || link.target === '_blank') return;
  event.preventDefault();
  if (url.pathname === location.pathname && url.hash) {
    document.querySelector(url.hash)?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    return;
  }
  history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
});

if (app) new MutationObserver(applyStudioExperience).observe(app, { childList: true, subtree: true });
window.addEventListener('popstate', applyStudioExperience);
window.addEventListener('load', applyStudioExperience, { once: true });
applyStudioExperience();

export { originalDirections, designReferences, cinematicReferences };
