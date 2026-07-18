import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/motion.css';
import './styles/image-led.css';

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
import { setupOperator } from './services/operator.js';
import { setupPricingContext } from './services/pricing-context.js';

const app = document.querySelector('#app');

function underConstructionPage() {
  return shell(underConstructionContent());
}

const DEMO_MODULES = {
  'greenline-lawn-and-grounds': () => Promise.all([import('./demos/greenline/page.js'), import('./demos/greenline/setup.js'), import('./demos/greenline/styles.css')]),
  'firejar-spicy-peanut-butter': () => Promise.all([import('./demos/firejar/page.js'), import('./demos/firejar/setup.js'), import('./demos/firejar/styles.css')]),
  'clearflow-plumbing': () => Promise.all([import('./demos/clearflow/page.js'), import('./demos/clearflow/setup.js'), import('./demos/clearflow/styles.css')]),
};

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
  const onClick = () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    button.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    button.innerHTML = icon(open ? 'menu' : 'close');
    menu.hidden = open;
  };
  button.addEventListener('click', onClick);
  return () => button.removeEventListener('click', onClick);
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
