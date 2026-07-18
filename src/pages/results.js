import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';

export function resultPage(success) {
  return shell(`<section class="result-section"><div class="result-card"><span class="eyebrow">${success ? 'Checkout complete' : 'Checkout canceled'}</span><h1>${success ? 'Your next step is project intake.' : 'No payment was completed.'}</h1><p>${success ? 'Stripe will send the sandbox receipt. Create or sign in with the checkout email so eligible paid records can be linked after confirmation.' : 'Your plan selection was not charged. Return to pricing or ask a question before continuing.'}</p><div class="hero-actions"><a class="button" href="${success ? '/signup' : '/pricing'}" data-nav>${success ? 'Open the workspace' : 'Return to pricing'} ${icon('arrow')}</a><a class="button button--ghost" href="/contact" data-nav>Contact us</a></div></div></section>`, { pathname: success ? '/success' : '/cancel' });
}

export function notFoundPage() {
  return shell(`<section class="result-section"><div class="result-card"><span class="eyebrow">404</span><h1>This page wandered off the layout.</h1><p>Return to the homepage or explore the portfolio.</p><div class="hero-actions"><a class="button" href="/" data-nav>Go home</a><a class="button button--ghost" href="/work" data-nav>View work</a></div></div></section>`);
}
