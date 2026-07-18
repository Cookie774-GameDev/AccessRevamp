import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/motion.css';

import { createRouter } from './app/router.js';
import { updateDocumentMetadata } from './app/metadata.js';
import { icon } from './components/icons.js';
import { shell } from './components/shell.js';
import { homePage } from './pages/home.js';
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
import { notFoundPage, resultPage } from './pages/results.js';
import {
  portfolioUnderConstructionPage as portfolioUnderConstructionContent,
  underConstructionPage as underConstructionContent,
} from './pages/under-construction.js';
import { setupCinematicExperience } from './cinematic-scroll.js';
import { setupContactForm } from './services/contact.js';
import { setupAuthForm } from './services/auth.js';
import { setupDashboard } from './services/dashboard.js';
import { setupCheckout } from './services/checkout.js';

const app = document.querySelector('#app');

function underConstructionPage() {
  return shell(underConstructionContent());
}

function portfolioUnderConstructionPage() {
  return shell(portfolioUnderConstructionContent(), { pathname: '/portfolio' });
}

const routes = {
  '/': homePage,
  '/portfolio': workPage,
  '/portfolio/:slug': portfolioUnderConstructionPage,
  '/work': workPage,
  '/work/:slug': (params) => workDetailPage(params) || notFoundPage(),
  '/services': servicesPage,
  '/process': () => processPage(),
  '/pricing': pricingPage,
  '/free-snapshot': underConstructionPage,
  '/sample-report': sampleReportPage,
  '/methodology': () => processPage({ methodology: true }),
  '/cinematic-scroll': cinematicPage,
  '/contact': contactPage,
  '/login': () => authPage('login'),
  '/signup': () => authPage('signup'),
  '/account/projects': dashboardPage,
  '/dashboard': dashboardPage,
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
  if (pathname === '/work' || pathname === '/portfolio') cleanups.push(setupWorkFilters());
  if (pathname === '/cinematic-scroll') cleanups.push(setupCinematicExperience());
  if (pathname === '/contact') cleanups.push(setupContactForm());
  if (pathname === '/login' || pathname === '/signup') cleanups.push(setupAuthForm(router.navigate));
  if (pathname === '/dashboard' || pathname === '/account/projects') cleanups.push(setupDashboard(router.navigate));

  return () => cleanups.forEach((cleanup) => cleanup?.());
}

router = createRouter({ routes, fallback: notFoundPage, render: renderRoute });
const cleanupCheckout = setupCheckout();
addEventListener('pagehide', cleanupCheckout, { once: true });
router.start();
