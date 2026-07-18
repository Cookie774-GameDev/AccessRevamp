import './portfolio.css';

const CANVA_FOLDER_URL = 'https://www.canva.com/folder/FAHPsX-3kKU';

const homepageConcepts = Object.freeze([
  {
    id: 'northline-goods',
    title: 'Northline Goods',
    category: 'Editorial commerce homepage',
    description: 'A calm product-first storefront with one clear promise, tactile proof, and a focused shopping path.',
    canvaUrl: 'https://www.canva.com/d/jYldqCoZrK1q82G',
    artClass: 'portfolio-art--northline',
    art: `
      <div class="concept-browser">
        <div class="concept-browser__bar"><span></span><span></span><span></span><em>northline.example</em></div>
        <div class="concept-site concept-site--northline">
          <div class="concept-site__nav"><b>NORTHLINE</b><div><span>Objects</span><span>Journal</span><span>About</span></div><i>Shop the edit</i></div>
          <div class="concept-site__hero">
            <div class="concept-site__copy"><small>THE MORNING EDIT · 01</small><strong>Objects for<br>slower mornings.</strong><p>Quiet materials, useful forms, and considered details for the everyday ritual.</p><i>Explore the collection</i></div>
            <div class="concept-product concept-product--northline"><span class="concept-vase"></span><span class="concept-cup"></span><span class="concept-shadow"></span></div>
          </div>
          <div class="concept-site__proof"><span>Natural materials</span><span>Small-batch production</span><span>Free shipping over $75</span></div>
        </div>
      </div>`,
  },
  {
    id: 'morrow-studio',
    title: 'Morrow Studio',
    category: 'Wellness service homepage',
    description: 'A welcoming booking experience that makes the service, schedule, and first action immediately understandable.',
    canvaUrl: 'https://www.canva.com/d/hg1_Ic6WRsGy4g1',
    artClass: 'portfolio-art--morrow',
    art: `
      <div class="concept-browser">
        <div class="concept-browser__bar"><span></span><span></span><span></span><em>morrow.example</em></div>
        <div class="concept-site concept-site--morrow">
          <div class="concept-site__nav"><b>MORROW / STUDIO</b><div><span>Practice</span><span>Schedule</span><span>Journal</span></div><i>Book a class</i></div>
          <div class="concept-site__hero concept-site__hero--morrow">
            <div class="concept-site__copy"><small>MOVEMENT FOR REAL LIFE</small><strong>A quieter kind<br>of strength.</strong><p>Small-group movement, thoughtful coaching, and a studio designed to meet you where you are.</p><div class="concept-actions"><i>View this week</i><span>New client intro · $24</span></div></div>
            <div class="concept-photo concept-photo--morrow"><span class="concept-arch"></span><span class="concept-figure"></span><span class="concept-floor"></span></div>
          </div>
          <div class="concept-stat-row"><span><b>8</b><small>people per class</small></span><span><b>45m</b><small>focused sessions</small></span><span><b>4.9</b><small>member rating</small></span></div>
        </div>
      </div>`,
  },
  {
    id: 'fable-finch',
    title: 'Fable & Finch',
    category: 'Fashion and lifestyle homepage',
    description: 'A bold editorial first screen that balances product storytelling, accessibility, and a direct collection CTA.',
    canvaUrl: 'https://www.canva.com/d/LZ6kuQOHgWsUiQd',
    artClass: 'portfolio-art--fable',
    art: `
      <div class="concept-browser">
        <div class="concept-browser__bar"><span></span><span></span><span></span><em>fableandfinch.example</em></div>
        <div class="concept-site concept-site--fable">
          <div class="concept-site__nav"><b>FABLE <em>&</em> FINCH</b><div><span>New</span><span>Clothing</span><span>Objects</span></div><i>Bag · 0</i></div>
          <div class="concept-site__hero concept-site__hero--fable">
            <div class="concept-site__copy"><small>AW 26 · EDIT 02</small><strong>Everyday pieces.<br>Lasting ritual.</strong><p>Natural layers and sculptural essentials designed for the pace you actually keep.</p><i>Discover the edit</i></div>
            <div class="concept-fashion-grid"><span class="concept-fashion-card concept-fashion-card--one"></span><span class="concept-fashion-card concept-fashion-card--two"></span><span class="concept-fashion-label">New season / 18 pieces</span></div>
          </div>
          <div class="concept-ticker"><span>Traceable fibers</span><span>Made in limited runs</span><span>30-day returns</span><span>Sizes XS–3X</span></div>
        </div>
      </div>`,
  },
]);

const posterConcepts = Object.freeze([
  {
    id: 'sip-savor',
    title: 'Sip / Savor',
    category: 'Seasonal coffee campaign',
    description: 'A high-contrast launch poster built around one product, one sensory hook, and one clear visit CTA.',
    canvaUrl: 'https://www.canva.com/d/ARTwlJ7MoEPENyD',
    artClass: 'portfolio-art--coffee',
    art: `
      <div class="concept-poster concept-poster--coffee">
        <div class="concept-poster__top"><span>SEASONAL RELEASE</span><span>SUMMER 26</span></div>
        <strong>SIP<br><em>/</em> SAVOR</strong>
        <div class="concept-poster__orb"><i></i><span></span></div>
        <p>Blood orange espresso tonic.<br>Bright, bitter, gone by August.</p>
        <div class="concept-poster__bottom"><b>NORTHLINE COFFEE</b><span>DAILY · 7—4</span></div>
      </div>`,
  },
  {
    id: 'move-well',
    title: 'Move Well',
    category: 'Wellness membership campaign',
    description: 'A confident fitness poster that keeps the offer legible while using energetic type and graphic movement.',
    canvaUrl: 'https://www.canva.com/d/qBgUoW7FSyF5JWB',
    artClass: 'portfolio-art--move',
    art: `
      <div class="concept-poster concept-poster--move">
        <div class="concept-poster__top"><span>MORROW / STUDIO</span><span>INTRO SERIES</span></div>
        <strong>MOVE<br>WELL</strong>
        <div class="concept-poster__motion"><i></i><i></i><i></i><i></i></div>
        <p>Three small-group sessions.<br>One clear place to begin.</p>
        <div class="concept-poster__offer"><b>$49</b><span>BOOK THE INTRO SERIES</span></div>
      </div>`,
  },
  {
    id: 'form-function',
    title: 'Form / Function',
    category: 'Home-goods product drop',
    description: 'A product-launch poster using modular composition, bold scale, and a simple release message.',
    canvaUrl: 'https://www.canva.com/d/4446zfXtAD452ln',
    artClass: 'portfolio-art--form',
    art: `
      <div class="concept-poster concept-poster--form">
        <div class="concept-poster__top"><span>OBJECT STUDY 04</span><span>LIMITED DROP</span></div>
        <strong>FORM<br><em>/</em> FUNCTION</strong>
        <div class="concept-poster__objects"><i></i><i></i><i></i></div>
        <p>Three useful objects.<br>One restrained material palette.</p>
        <div class="concept-poster__bottom"><b>FABLE & FINCH</b><span>RELEASES 08.14</span></div>
      </div>`,
  },
]);

const allPortfolioItems = Object.freeze([...homepageConcepts, ...posterConcepts]);

function externalArrow() {
  return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 14 14 6M8 6h6v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function portfolioCard(item, compact = false) {
  return `
    <article class="portfolio-card${compact ? ' portfolio-card--compact' : ''}">
      <a class="portfolio-card__visual" href="${item.canvaUrl}" target="_blank" rel="noopener noreferrer" aria-label="Open ${item.title} concept in Canva">
        <div class="portfolio-art ${item.artClass}" aria-hidden="true">${item.art}</div>
      </a>
      <div class="portfolio-card__body">
        <span class="portfolio-card__category">${item.category}</span>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <a class="portfolio-card__source" href="${item.canvaUrl}" target="_blank" rel="noopener noreferrer">View Canva source ${externalArrow()}</a>
      </div>
    </article>`;
}

function portfolioDisclaimer() {
  return '<div class="portfolio-disclaimer"><strong>Concept-work disclosure</strong><span>Every piece shown here is original, fictional concept work created for the AccessRevamp portfolio. These are not client endorsements, unsolicited prospect redesigns, or claims of a business relationship.</span></div>';
}

function homepagePortfolioSection() {
  return `
    <section class="section portfolio-home" data-portfolio-home>
      <div class="container">
        <div class="portfolio-heading">
          <div><span class="eyebrow">Selected concept work</span><h2>Homepages designed to make the next step obvious.</h2><p>Original fictional concepts showing how brand expression, accessible interaction, and conversion hierarchy can work together.</p></div>
          <a class="text-arrow" href="/portfolio" data-portfolio-nav>View the full portfolio ${externalArrow()}</a>
        </div>
        <div class="portfolio-grid portfolio-grid--home">${homepageConcepts.map((item) => portfolioCard(item, true)).join('')}</div>
        ${portfolioDisclaimer()}
      </div>
    </section>`;
}

function portfolioPage() {
  return `
    <section class="portfolio-hero">
      <div class="container portfolio-hero__grid">
        <div><span class="eyebrow">AccessRevamp portfolio</span><h1>Clearer homepages.<br>Campaigns made to move.</h1><p class="lede">A collection of original homepage and marketing concepts showing the visual standard behind AccessRevamp’s redesign and creative work.</p><div class="hero-actions"><a class="button" href="/pricing" data-portfolio-nav>Explore the plans</a><a class="button button-ghost" href="${CANVA_FOLDER_URL}" target="_blank" rel="noopener noreferrer">Open the Canva folder ${externalArrow()}</a></div></div>
        <div class="portfolio-hero__stack" aria-hidden="true"><span class="portfolio-hero__sheet portfolio-hero__sheet--one"></span><span class="portfolio-hero__sheet portfolio-hero__sheet--two"></span><span class="portfolio-hero__sheet portfolio-hero__sheet--three"></span><div><b>6</b><small>original concepts</small></div></div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        ${portfolioDisclaimer()}
        <div class="portfolio-heading portfolio-heading--section"><div><span class="eyebrow">Homepage concepts</span><h2>Three distinct brand directions, each built around a usable first screen.</h2></div><p>These are design demonstrations, not live client sites. Each concept focuses on message hierarchy, readable contrast, clear calls to action, responsive composition, and credible brand detail.</p></div>
        <div class="portfolio-grid portfolio-grid--home">${homepageConcepts.map((item) => portfolioCard(item)).join('')}</div>
      </div>
    </section>
    <section class="section section-tint">
      <div class="container">
        <div class="portfolio-heading portfolio-heading--section"><div><span class="eyebrow">Campaign posters</span><h2>High-impact creative without high production overhead.</h2></div><p>Original Canva concepts designed around one offer, one audience, and one action—exactly the bounded approach used in the $199 Quick Fix creative pack.</p></div>
        <div class="portfolio-grid portfolio-grid--posters">${posterConcepts.map((item) => portfolioCard(item)).join('')}</div>
      </div>
    </section>
    <section class="section">
      <div class="container portfolio-process">
        <article><span>01</span><h3>Brief around the real goal</h3><p>We define the audience, offer, primary action, brand constraints, and accessibility requirements before styling begins.</p></article>
        <article><span>02</span><h3>Use AI for speed, not approval</h3><p>AI can help explore copy and composition. A person still reviews the final hierarchy, claims, asset rights, and usability.</p></article>
        <article><span>03</span><h3>Deliver reusable systems</h3><p>Approved directions become responsive site components or Canva-ready formats instead of disposable one-off graphics.</p></article>
      </div>
    </section>
    <section class="section section-tight"><div class="container cta-panel"><div><span class="eyebrow">Build the next piece</span><h2>Bring us one public website and one clear business goal.</h2><p>We’ll document the friction, show a stronger direction, and confirm the scope before implementation.</p></div><div class="cta-actions"><a class="button button-light" href="/pricing" data-portfolio-nav>View one-time plans</a><a class="button button-outline-light" href="/contact" data-portfolio-nav>Start a conversation</a></div></div></section>`;
}

function makeNavLink(label = 'Portfolio') {
  const link = document.createElement('a');
  link.href = '/portfolio';
  link.textContent = label;
  link.dataset.portfolioNav = '';
  link.dataset.portfolioLink = '';
  if (location.pathname === '/portfolio') link.setAttribute('aria-current', 'page');
  return link;
}

function injectNavigation() {
  const desktopNav = document.querySelector('.desktop-nav');
  if (desktopNav && !desktopNav.querySelector('[data-portfolio-link]')) {
    const pricingLink = desktopNav.querySelector('a[href="/pricing"]');
    desktopNav.insertBefore(makeNavLink(), pricingLink || null);
  }

  const mobileNav = document.querySelector('.mobile-nav nav');
  if (mobileNav && !mobileNav.querySelector('[data-portfolio-link]')) {
    const pricingLink = mobileNav.querySelector('a[href="/pricing"]');
    mobileNav.insertBefore(makeNavLink(), pricingLink || null);
  }

  const exploreColumn = [...document.querySelectorAll('.footer-grid > div')].find((column) => column.querySelector('h2')?.textContent.trim() === 'Explore');
  if (exploreColumn && !exploreColumn.querySelector('[data-portfolio-link]')) {
    const link = makeNavLink('Portfolio');
    const outreach = exploreColumn.querySelector('a[href="/outreach-standards"]');
    exploreColumn.insertBefore(link, outreach || null);
  }
}

function updatePortfolioMeta() {
  document.title = 'Portfolio | AccessRevamp';
  document.querySelector('meta[name="description"]')?.setAttribute('content', 'Explore original AccessRevamp homepage concepts and Canva campaign posters, all clearly labeled as fictional portfolio work.');
}

function applyPortfolioExperience() {
  injectNavigation();
  const main = document.querySelector('#main-content');
  if (!main) return;

  if (location.pathname === '/portfolio') {
    if (main.dataset.portfolioRendered !== 'true') {
      main.dataset.portfolioRendered = 'true';
      main.innerHTML = portfolioPage();
    }
    updatePortfolioMeta();
    return;
  }

  if (location.pathname === '/' && !main.querySelector('[data-portfolio-home]')) {
    const pricingSection = main.querySelector('.pricing-heading')?.closest('section');
    if (pricingSection) pricingSection.insertAdjacentHTML('beforebegin', homepagePortfolioSection());
  }
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-portfolio-nav]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
  const url = new URL(link.href, location.origin);
  if (url.origin !== location.origin) return;
  event.preventDefault();
  if (url.pathname === location.pathname) return;
  history.pushState({}, '', url.pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
});

new MutationObserver(applyPortfolioExperience).observe(document.querySelector('#app'), { childList: true, subtree: true });
window.addEventListener('popstate', () => requestAnimationFrame(applyPortfolioExperience));
applyPortfolioExperience();

export { allPortfolioItems, homepageConcepts, posterConcepts };
