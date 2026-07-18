import { siteConfig } from '../config.js';
import { primaryNavigation } from '../data/navigation.js';
import { brandLink } from './brand.js';
import { escapeHtml, icon } from './icons.js';

const navLink = ([href, label], pathname) => {
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return `<a href="${href}" data-nav${active ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`;
};

export function sandboxBadge() {
  return siteConfig.checkoutIsSandbox
    ? '<span class="sandbox-badge" title="Stripe test mode is active"><i></i> Sandbox checkout</span>'
    : '';
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
          <a class="button button--small" href="/pricing" data-nav>Start a revamp ${icon('arrow')}</a>
          <button class="menu-button" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-navigation">${icon('menu')}</button>
        </div>
      </div>
      <div class="mobile-nav" id="mobile-navigation" hidden><nav aria-label="Mobile">${primary}<a href="/login" data-nav>Sign in</a><a href="/pricing" data-nav>Start a revamp</a></nav></div>
    </header>
    <main id="main-content">${content}</main>
    <footer class="site-footer">
      <div class="container-wide footer-main">
        <div class="footer-brand">${brandLink()}<p>Clearer storefronts, stronger stories, and practical next steps.</p></div>
        <div class="footer-links"><div><h2>Explore</h2><a href="/work" data-nav>Work</a><a href="/services" data-nav>Services</a><a href="/sample-report" data-nav>Sample report</a><a href="/cinematic-scroll" data-nav>Cinematic demo</a></div><div><h2>Company</h2><a href="/process" data-nav>Process</a><a href="/contact" data-nav>Contact</a><a href="/accessibility" data-nav>Accessibility</a><a href="/privacy" data-nav>Privacy</a></div></div>
        <div class="footer-statement"><span>Small studio.<br/>Human judgment.<br/>No vague retainers.</span>${sandboxBadge()}</div>
      </div>
      <div class="container-wide footer-bottom"><span>© ${new Date().getFullYear()} AccessRevamp</span><span>One-time services · Clear scope · <a href="/terms" data-nav>Terms</a></span></div>
    </footer>
  </div>`;
}
