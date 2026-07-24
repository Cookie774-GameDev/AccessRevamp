import { primaryNavigation } from '../data/navigation.js';
import { brandLink } from './brand.js';
import { escapeHtml, icon } from './icons.js';

const SUPPORT_EMAIL = 'support.accessrevamp.com@gmail.com';

const navLink = ([href, label], pathname) => {
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return `<a href="${href}" data-nav${active ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`;
};

// Payment environment details remain a private deployment control. They are not
// exposed as a customer-facing badge in the production website.
export function sandboxBadge() {
  return '';
}

export function shell(content, { pathname = location.pathname, home = false, pageClass = '' } = {}) {
  const primary = primaryNavigation.map((item) => navLink(item, pathname)).join('');
  return `<div class="site-shell ${pageClass}">
    <header class="site-header" data-header>
      <div class="nav-wrap container-wide">
        ${brandLink({ animated: home })}
        <nav class="desktop-nav" aria-label="Primary">${primary}</nav>
        <div class="nav-actions">
          <a class="text-link nav-signin" href="/login" data-nav>Sign in</a>
          <a class="button button--small" href="/pricing" data-nav>Get the $50 Homepage Reveal ${icon('arrow')}</a>
          <button class="menu-button" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-navigation">${icon('menu')}</button>
        </div>
      </div>
      <div class="mobile-nav" id="mobile-navigation" hidden><nav aria-label="Mobile">${primary}<a href="/login" data-nav>Sign in</a><a href="/pricing" data-nav>Get the $50 Homepage Reveal</a></nav></div>
    </header>
    <main id="main-content">${content}</main>
    <footer class="site-footer">
      <div class="container-wide footer-main">
        <div class="footer-brand">${brandLink()}<p>Verified friction, a clearer hierarchy, and a one-time path to a better website.</p></div>
        <div class="footer-links"><div><h2>Explore</h2><a href="/portfolio" data-nav>Portfolio</a><a href="/free-snapshot" data-nav>Free snapshot</a><a href="/sample-report" data-nav>Sample report</a><a href="/methodology" data-nav>Methodology</a><a href="/support" data-nav>Customer support</a></div><div><h2>Policies</h2><a href="/legal" data-nav>Policy center</a><a href="/policy" data-nav>Customer policy</a><a href="/privacy" data-nav>Privacy policy</a><a href="/terms" data-nav>Terms</a><a href="/refunds" data-nav>Refunds</a><a href="/accessibility" data-nav>Accessibility</a></div></div>
        <div class="footer-statement"><span>Evidence first.<br/>Human reviewed.<br/>One-time scope.</span><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></div>
      </div>
      <div class="container-wide footer-bottom"><span>© ${new Date().getFullYear()} AccessRevamp</span><span>One-time services · Clear scope · Private customer delivery</span></div>
    </footer>
  </div>`;
}
