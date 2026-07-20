import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/motion.css';
import './styles/image-led.css';
import './styles/studio-redesign.css';
import './styles/cinematic-renaissance.css';
import './styles/mobile.css';
import './styles/order-wizard-dark-contrast.css';

import { createRouter } from './app/router.js';
import { updateDocumentMetadata } from './app/metadata.js';
import { icon } from './components/icons.js';
import { shell } from './components/shell.js';
import { homePage } from './pages/home.js';
import { setupHomeExperience } from './pages/home-interactions.js';
import { workDetailPage, workPage, setupWorkFilters } from './pages/work.js';
import { servicesPage } from './pages/services.js';
import { pricingPage } from './pages/pricing.js';
import { sampleReportPage } from './pages/sample-report.js';
import { processPage } from './pages/process.js';
import { cinematicPage } from './pages/cinematic.js';
import { contactPage } from './pages/contact.js';
import { authPage } from './pages/auth.js';
import { dashboardPage } from './pages/dashboard.js';
import { legalPage } from './pages/legal.js';
import { freeSnapshotPage } from './pages/free-snapshot.js';
import { accountProjectsPage } from './pages/account-projects.js';
import { projectIntakePage } from './pages/project-intake.js';
import { operatorPage } from './pages/operator.js';
import { notFoundPage, resultPage } from './pages/results.js';
import { underConstructionPage as underConstructionContent } from './pages/under-construction.js';
import { setupCinematicExperience } from './cinematic-scroll.js';
import { setupContactForm } from './services/contact.js';
import { setupAuthForm } from './services/auth.js';
import { setupDashboard } from './services/dashboard.js';
import { setupCheckout } from './services/checkout.js';
import { setupFreeSnapshot } from './services/free-snapshot.js';
import { setupAccountProjects } from './services/account-projects.js';
import { setupProjectIntake } from './services/project-intake.js';
import { setupOperator } from './services/operator.js';
import { setupPricingContext } from './services/pricing-context.js';

const app = document.querySelector('#app');

function underConstructionPage() {
  return shell(underConstructionContent());
}

const DEMO_MODULES = {};

function demoLoadingPage({ slug }) {
  return shell(`<section class="section"><div class="container-narrow"><span class="eyebrow">Working demonstration</span><h1>Opening the demo…</h1><p role="status" data-demo-loader data-demo-slug="${slug}">Loading the route-specific experience.</p></div></section>`, { pathname: '/portfolio' });
}

const routes = {
  '/': homePage,
  '/portfolio': workPage,
  '/portfolio/:slug': demoLoadingPage,
  '/work': workPage,
  '/work/:slug': (params) => workDetailPage(params) || notFoundPage(),
  '/services': servicesPage,
  '/process': () => processPage(),
  '/pricing': pricingPage,
  '/free-snapshot': freeSnapshotPage,
  '/sample-report': sampleReportPage,
  '/methodology': () => processPage({ methodology: true }),
  '/cinematic-scroll': cinematicPage,
  '/contact': contactPage,
  '/login': () => authPage('login'),
  '/signup': () => authPage('signup'),
  '/account/projects': accountProjectsPage,
  '/project-intake': projectIntakePage,
  '/dashboard': dashboardPage,
  '/operator': operatorPage,
  '/privacy': () => legalPage('privacy'),
  '/terms': () => legalPage('terms'),
  '/accessibility': () => legalPage('accessibility'),
  '/refunds': () => legalPage('refunds'),
  '/legal': () => legalPage('legal'),
  '/outreach-standards': () => legalPage('outreach'),
  '/success': () => resultPage(true),
  '/cancel': () => resultPage(false),
  '/preview/:token': underConstructionPage,
};

function setupMenu() {
  const button = document.querySelector('.menu-button');
  const menu = document.querySelector('.mobile-nav');
  if (!button || !menu) return undefined;

  const mobileMedia = globalThis.matchMedia?.('(max-width: 1000px)');
  let open = false;

  const setOpen = (next, { restoreFocus = false, focusMenu = false } = {}) => {
    open = Boolean(next && (mobileMedia?.matches ?? true));
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    button.innerHTML = icon(open ? 'close' : 'menu');
    menu.hidden = !open;
    menu.toggleAttribute('inert', !open);
    document.documentElement.classList.toggle('mobile-menu-open', open);

    if (open && focusMenu) {
      requestAnimationFrame(() => menu.querySelector('a')?.focus({ preventScroll: true }));
    } else if (!open && restoreFocus) {
      button.focus({ preventScroll: true });
    }
  };

  const onButtonClick = () => setOpen(!open, { focusMenu: !open });
  const onMenuClick = (event) => {
    if (event.target.closest('a')) setOpen(false);
  };
  const onDocumentPointerDown = (event) => {
    if (open && !event.target.closest('.site-header')) setOpen(false);
  };
  const onDocumentKeyDown = (event) => {
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault();
    setOpen(false, { restoreFocus: true });
  };
  const onMediaChange = () => {
    if (!mobileMedia?.matches) setOpen(false);
  };

  button.addEventListener('click', onButtonClick);
  menu.addEventListener('click', onMenuClick);
  document.addEventListener('pointerdown', onDocumentPointerDown);
  document.addEventListener('keydown', onDocumentKeyDown);
  if (mobileMedia?.addEventListener) mobileMedia.addEventListener('change', onMediaChange);
  else mobileMedia?.addListener?.(onMediaChange);
  setOpen(false);

  return () => {
    button.removeEventListener('click', onButtonClick);
    menu.removeEventListener('click', onMenuClick);
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    document.removeEventListener('keydown', onDocumentKeyDown);
    if (mobileMedia?.removeEventListener) mobileMedia.removeEventListener('change', onMediaChange);
    else mobileMedia?.removeListener?.(onMediaChange);
    setOpen(false);
  };
}

let router;

function renderRoute({ pathname, pattern, params, view }) {
  app.innerHTML = view(params);
  updateDocumentMetadata(pathname, pattern);

  const cleanups = [setupMenu()];
  if (pathname === '/') cleanups.push(setupHomeExperience(app));
  if (pathname === '/work' || pathname === '/portfolio') cleanups.push(setupWorkFilters());
  if (pathname === '/cinematic-scroll') cleanups.push(setupCinematicExperience());
  if (pathname === '/contact') cleanups.push(setupContactForm());
  if (pathname === '/free-snapshot') cleanups.push(setupFreeSnapshot());
  if (pathname === '/pricing') cleanups.push(setupPricingContext());
  if (pathname === '/login' || pathname === '/signup') cleanups.push(setupAuthForm(router.navigate));
  if (pathname === '/dashboard') cleanups.push(setupDashboard(router.navigate));
  if (pathname === '/account/projects') cleanups.push(setupAccountProjects(router.navigate));
  if (pathname === '/project-intake') cleanups.push(setupProjectIntake());
  if (pathname === '/operator') cleanups.push(setupOperator());

  if (pattern === '/portfolio/:slug') {
    let active = true;
    const load = DEMO_MODULES[params.slug];
    if (!load) {
      app.innerHTML = notFoundPage();
    } else {
      load().then(([pageModule, setupModule]) => {
        if (!active) return;
        app.innerHTML = pageModule.page();
        cleanups.push(setupModule.setup(app), setupMenu());
      }).catch(() => {
        if (!active) return;
        app.innerHTML = shell(`<section class="section"><div class="container-narrow"><h1>The demonstration could not load.</h1><p>The explanatory portfolio content is still available.</p><a class="button" href="/portfolio" data-nav>Return to portfolio</a></div></section>`);
      });
    }
    cleanups.push(() => { active = false; });
  }

  return () => cleanups.forEach((cleanup) => cleanup?.());
}

router = createRouter({ routes, fallback: notFoundPage, render: renderRoute });
const cleanupCheckout = setupCheckout();
addEventListener('pagehide', cleanupCheckout, { once: true });
router.start();
