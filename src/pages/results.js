import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';

export function resultPage(success) {
  if (success) {
    return shell(`<section class="result-section"><div class="result-card" data-checkout-result><span class="eyebrow">Payment verification</span><h1 data-checkout-result-heading>Verifying your payment…</h1><p data-checkout-result-message role="status" aria-live="polite">The browser redirect is not payment proof. AccessRevamp is checking the durable order created by the signed Stripe webhook.</p><div class="hero-actions"><a class="button" href="/account/projects" data-nav data-checkout-result-action>Open the workspace ${icon('arrow')}</a><a class="button button--ghost" href="/contact" data-nav>Contact us</a></div></div></section>`, { pathname: '/success' });
  }
  return shell(`<section class="result-section"><div class="result-card"><span class="eyebrow">Checkout canceled</span><h1>No payment was completed on this screen.</h1><p>Your saved request remains available. An existing Stripe Checkout Session may still be open, so reuse the request instead of starting duplicate payments.</p><div class="hero-actions"><a class="button" href="/#start-project" data-nav>Return to your request ${icon('arrow')}</a><a class="button button--ghost" href="/contact" data-nav>Contact us</a></div></div></section>`, { pathname: '/cancel' });
}

export function notFoundPage() {
  return shell(`<section class="result-section"><div class="result-card"><span class="eyebrow">404</span><h1>This page wandered off the layout.</h1><p>Return to the homepage or explore the portfolio.</p><div class="hero-actions"><a class="button" href="/" data-nav>Go home</a><a class="button button--ghost" href="/work" data-nav>View work</a></div></div></section>`);
}
