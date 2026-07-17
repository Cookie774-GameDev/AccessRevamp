import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const write = async (path, content) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content.trimStart(), 'utf8');
};

await write('package.json', String.raw`
{
  "name": "accessrevamp-platform",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node --test tests/*.test.mjs",
    "lint": "node scripts/check.mjs",
    "check": "npm run lint && npm test && npm run build"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.50.0",
    "stripe": "^18.0.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "vite": "^7.0.0"
  }
}
`);

await write('vite.config.js', String.raw`
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
`);

await write('index.html', String.raw`
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#07111f" />
    <meta name="description" content="AccessRevamp creates clear, human-reviewed storefront improvement plans and polished website revamps with simple one-time pricing." />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <meta property="og:title" content="AccessRevamp — Practical storefront improvements" />
    <meta property="og:description" content="See the issues, understand the priorities, and choose a clear one-time path forward." />
    <meta property="og:type" content="website" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <title>AccessRevamp — Practical storefront improvements</title>
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to content</a>
    <div id="app"></div>
    <noscript>This site needs JavaScript for navigation and account features. Pricing and service details remain available in the repository documentation.</noscript>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`);

await write('public/favicon.svg', String.raw`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="AccessRevamp">
  <rect width="64" height="64" rx="16" fill="#07111f"/>
  <path d="M17 45 29 17h7l12 28h-8l-2.1-5.3H26.5L24.3 45Zm12-12h6.4L32.2 24Z" fill="#63e6d4"/>
</svg>
`);

await write('public/robots.txt', String.raw`
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /login
Disallow: /signup
Sitemap: /sitemap.xml
`);

await write('public/sitemap.xml', String.raw`
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://accessrevamp.netlify.app/</loc></url>
  <url><loc>https://accessrevamp.netlify.app/pricing</loc></url>
  <url><loc>https://accessrevamp.netlify.app/sample-report</loc></url>
  <url><loc>https://accessrevamp.netlify.app/methodology</loc></url>
  <url><loc>https://accessrevamp.netlify.app/contact</loc></url>
  <url><loc>https://accessrevamp.netlify.app/accessibility</loc></url>
</urlset>
`);

await write('src/config.js', String.raw`
export const plans = Object.freeze({
  homepage_reveal: Object.freeze({
    key: 'homepage_reveal',
    name: 'Homepage Reveal',
    amount: 5000,
    displayPrice: '$50',
    cadence: 'one-time',
    stripePriceId: import.meta.env.VITE_STRIPE_HOMEPAGE_REVEAL_PRICE_ID || 'price_1TuGoNLzyGRcyGQJRjtGsiMV',
    checkoutUrl: import.meta.env.VITE_STRIPE_HOMEPAGE_REVEAL_URL || 'https://book.stripe.com/test_dRmdRabhid0QfBfedagQE00',
  }),
  quick_fix: Object.freeze({
    key: 'quick_fix',
    name: 'Quick Fix Plan',
    amount: 19900,
    displayPrice: '$199',
    cadence: 'one-time',
    stripePriceId: import.meta.env.VITE_STRIPE_QUICK_FIX_PRICE_ID || 'price_1TuGoTLzyGRcyGQJfdkqoE3f',
    checkoutUrl: import.meta.env.VITE_STRIPE_QUICK_FIX_URL || 'https://book.stripe.com/test_cNi00k99a1i81Kp6KIgQE01',
  }),
});

export const siteConfig = Object.freeze({
  name: 'AccessRevamp',
  siteUrl: (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, ''),
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  checkoutIsSandbox: Object.values(plans).some((plan) => plan.checkoutUrl.includes('/test_')),
});

export const servicePromise = Object.freeze([
  'Clear scope before payment',
  'Human-reviewed findings',
  'One-time pricing only',
  'No surprise add-on platform fee',
]);
`);

await write('src/lib/supabase.js', String.raw`
import { createClient } from '@supabase/supabase-js';
import { siteConfig } from '../config.js';

let client;

export function getSupabase() {
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseKey) return null;
  if (!client) {
    client = createClient(siteConfig.supabaseUrl, siteConfig.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
`);

await write('src/main.js', String.raw`
import './styles.css';
import { plans, siteConfig, servicePromise } from './config.js';
import { getSupabase } from './lib/supabase.js';

const app = document.querySelector('#app');
const routeMeta = {
  '/': ['Practical storefront improvements', 'See the issues, understand the priorities, and choose a clear one-time path forward.'],
  '/pricing': ['Simple one-time pricing', 'Two clear AccessRevamp services with no subscription or recurring platform fee.'],
  '/sample-report': ['Sample report', 'See how AccessRevamp documents evidence, impact, and repair priorities.'],
  '/methodology': ['Methodology', 'A transparent, passive, human-reviewed assessment process.'],
  '/outreach-standards': ['Outreach standards', 'How AccessRevamp keeps business outreach relevant, accurate, and easy to stop.'],
  '/contact': ['Contact', 'Tell AccessRevamp what you want to improve.'],
  '/login': ['Sign in', 'Access your AccessRevamp project workspace.'],
  '/signup': ['Create an account', 'Create your AccessRevamp project workspace.'],
  '/dashboard': ['Dashboard', 'View your AccessRevamp projects and orders.'],
  '/privacy': ['Privacy', 'How AccessRevamp handles contact, account, and order information.'],
  '/terms': ['Terms', 'AccessRevamp service terms.'],
  '/accessibility': ['Accessibility statement', 'Our commitment to an accessible AccessRevamp experience.'],
  '/success': ['Payment received', 'Your AccessRevamp checkout was completed.'],
  '/cancel': ['Checkout canceled', 'No AccessRevamp payment was completed.'],
};

const icon = (name) => {
  const paths = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    shield: '<path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.6-4"/>',
    spark: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  };
  return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.spark) + '</svg>';
};

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const navLink = (href, label) => '<a href="' + href + '" data-nav' + (location.pathname === href ? ' aria-current="page"' : '') + '>' + label + '</a>';
const sandboxBadge = siteConfig.checkoutIsSandbox ? '<span class="sandbox-badge" title="Stripe test mode is active">Sandbox checkout</span>' : '';

function shell(content) {
  return '<div class="site-shell">' +
    '<header class="site-header"><div class="nav-wrap container">' +
      '<a class="brand" href="/" data-nav aria-label="AccessRevamp home"><span class="brand-mark">A</span><span>AccessRevamp</span></a>' +
      '<nav class="desktop-nav" aria-label="Primary">' + navLink('/methodology', 'Method') + navLink('/sample-report', 'Sample') + navLink('/pricing', 'Pricing') + navLink('/contact', 'Contact') + '</nav>' +
      '<div class="nav-actions"><a class="text-link hide-small" href="/login" data-nav>Sign in</a><a class="button button-small" href="/pricing" data-nav>View plans</a><button class="menu-button" type="button" aria-label="Open menu" aria-expanded="false">' + icon('menu') + '</button></div>' +
    '</div><div class="mobile-nav" hidden><nav aria-label="Mobile">' + navLink('/methodology', 'Methodology') + navLink('/sample-report', 'Sample report') + navLink('/pricing', 'Pricing') + navLink('/contact', 'Contact') + navLink('/login', 'Sign in') + '</nav></div></header>' +
    '<main id="main-content">' + content + '</main>' +
    '<footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/" data-nav><span class="brand-mark">A</span><span>AccessRevamp</span></a><p>Clear evidence, thoughtful design, and a practical path forward.</p></div><div><h2>Explore</h2>' + navLink('/pricing', 'Pricing') + navLink('/sample-report', 'Sample report') + navLink('/methodology', 'Methodology') + navLink('/outreach-standards', 'Outreach standards') + '</div><div><h2>Company</h2>' + navLink('/contact', 'Contact') + navLink('/accessibility', 'Accessibility') + navLink('/privacy', 'Privacy') + navLink('/terms', 'Terms') + '</div><div class="footer-note"><span class="status-dot"></span><span>Human review is part of every paid deliverable.</span></div></div><div class="container footer-bottom"><span>© ' + new Date().getFullYear() + ' AccessRevamp</span><span>No subscriptions. No invented findings.</span></div></footer>' +
  '</div>';
}

const trustRow = () => '<div class="trust-row" aria-label="Service promises">' + servicePromise.map((item) => '<span>' + icon('check') + escapeHtml(item) + '</span>').join('') + '</div>';

function homePage() {
  return shell(
    '<section class="hero section"><div class="container hero-grid"><div class="hero-copy"><div class="eyebrow"><span class="eyebrow-dot"></span>Storefront clarity, before a rebuild</div><h1>See what is holding your storefront back—then fix what matters.</h1><p class="lede">AccessRevamp turns passive site observations into a clear, human-reviewed improvement plan. Start with a homepage concept and evidence report, or choose a complete one-time revamp.</p><div class="hero-actions"><a class="button" href="/pricing" data-nav>See one-time plans ' + icon('arrow') + '</a><a class="button button-ghost" href="/sample-report" data-nav>Open sample report</a></div>' + trustRow() + '</div>' +
    '<div class="hero-visual" aria-label="Illustrative AccessRevamp report preview"><div class="window-bar"><span></span><span></span><span></span><em>review.accessrevamp</em></div><div class="score-panel"><div><span class="micro-label">Review snapshot</span><strong>Clear next steps</strong></div><div class="signal-ring"><span>4</span><small>priority areas</small></div></div><div class="finding-list"><article><span class="severity high">High</span><div><strong>Primary action is visually buried</strong><p>Visitors must scan competing elements before the main purchase path becomes clear.</p></div></article><article><span class="severity medium">Medium</span><div><strong>Contrast needs verification</strong><p>Muted controls may not meet the intended contrast target across states.</p></div></article><article><span class="severity low">Plan</span><div><strong>Rebuild the first-screen hierarchy</strong><p>Use one promise, one supporting proof point, and one clear action.</p></div></article></div><div class="visual-footer"><span>' + icon('shield') + 'Passive review only</span><span>Evidence before claims</span></div></div></div></section>' +
    '<section class="logo-strip"><div class="container"><p>Designed for independent storefronts and service businesses using</p><div><span>Shopify</span><span>WordPress</span><span>WooCommerce</span><span>Squarespace</span><span>Custom sites</span></div></div></section>' +
    '<section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">What you receive</span><h2>Not a mystery audit. A documented decision.</h2><p>Every observation is labeled, explained, and separated from anything that still needs verification.</p></div><div class="card-grid three"><article class="feature-card"><span class="feature-icon">01</span><h3>Evidence you can inspect</h3><p>Plain-language observations, screenshots or references, impact, priority, and the reasoning behind each recommendation.</p></article><article class="feature-card"><span class="feature-icon">02</span><h3>A design direction</h3><p>A polished visual concept that shows how the homepage hierarchy, offer, proof, and calls to action can work together.</p></article><article class="feature-card"><span class="feature-icon">03</span><h3>A bounded next step</h3><p>Choose the reveal only, or move to a complete agreed revamp. Both are one-time services with written scope.</p></article></div></div></section>' +
    '<section class="section section-tint"><div class="container split"><div><span class="eyebrow">How it works</span><h2>Careful enough to trust. Simple enough to act on.</h2><p class="body-large">Automated checks can flag possibilities. AccessRevamp does not present those possibilities as facts until a person has reviewed the evidence.</p><a class="text-arrow" href="/methodology" data-nav>Read the complete methodology ' + icon('arrow') + '</a></div><ol class="steps"><li><span>1</span><div><h3>Passive review</h3><p>We inspect public pages without logging in, submitting forms, probing private routes, or interacting with checkout.</p></div></li><li><span>2</span><div><h3>Human verification</h3><p>Potential findings are confirmed, softened, or removed before they appear in a customer-facing report.</p></div></li><li><span>3</span><div><h3>Prioritized delivery</h3><p>You receive the evidence, proposed direction, boundaries, and a clear list of what happens next.</p></div></li></ol></div></section>' +
    '<section class="section"><div class="container"><div class="section-heading pricing-heading"><div><span class="eyebrow">One-time pricing</span><h2>Choose the depth you need.</h2></div><a class="text-arrow" href="/pricing" data-nav>Compare every detail ' + icon('arrow') + '</a></div>' + pricingCards(false) + '</div></section>' +
    '<section class="section"><div class="container cta-panel"><div><span class="eyebrow">Start with clarity</span><h2>A better storefront begins with a defensible first step.</h2><p>Review the sample, understand the method, then choose only the scope that fits.</p></div><div class="cta-actions"><a class="button button-light" href="/sample-report" data-nav>See the sample</a><a class="button button-outline-light" href="/contact" data-nav>Ask a question</a></div></div></section>'
  );
}

function pricingCards(detailed = true) {
  const reveal = plans.homepage_reveal;
  const quick = plans.quick_fix;
  return '<div class="pricing-grid"><article class="price-card"><div class="price-top"><div><span class="plan-label">Focused first step</span><h3>' + reveal.name + '</h3></div><span class="price"><strong>' + reveal.displayPrice + '</strong><small>one time</small></span></div><p>See the reviewed findings and the complete first-screen homepage concept prepared for your storefront.</p><ul class="check-list"><li>Human-reviewed homepage observations</li><li>Evidence and priority notes</li><li>Accessibility and usability concerns</li><li>Passive technical and security-hygiene observations</li><li>Complete homepage concept reveal</li><li>Repair recommendations and next steps</li></ul>' + (detailed ? '<div class="scope-note"><strong>Boundary:</strong> This plan delivers the reveal and report; it does not include implementation.</div>' : '') + '<a class="button button-full" href="' + reveal.checkoutUrl + '" rel="noopener" data-checkout="homepage_reveal">Choose Homepage Reveal</a>' + sandboxBadge + '</article>' +
  '<article class="price-card featured"><div class="recommended">Complete revamp</div><div class="price-top"><div><span class="plan-label">Full one-time service</span><h3>' + quick.name + '</h3></div><span class="price"><strong>' + quick.displayPrice + '</strong><small>one time</small></span></div><p>A complete agreed website revamp, plus the documented findings and practical growth recommendations.</p><ul class="check-list"><li>Everything in Homepage Reveal</li><li>Complete agreed website redesign and implementation</li><li>Accessibility, usability, and responsive checks</li><li>Prioritized technical and security-hygiene notes</li><li>Retest summary for the delivered scope</li><li>Customer reach, advertising, and monetization ideas</li></ul>' + (detailed ? '<div class="scope-note"><strong>Boundary:</strong> Scope, platform access, page count, and delivery window are confirmed in writing before work begins.</div>' : '') + '<a class="button button-full" href="' + quick.checkoutUrl + '" rel="noopener" data-checkout="quick_fix">Choose Quick Fix Plan</a>' + sandboxBadge + '</article></div>';
}

function pricingPage() {
  return shell('<section class="page-hero"><div class="container narrow"><span class="eyebrow">Two plans. No subscription.</span><h1>Simple one-time pricing, with the scope written down.</h1><p class="lede">Pay once for the selected service. There is no recurring AccessRevamp platform charge and no hidden implementation tier.</p></div></section><section class="section section-tight"><div class="container">' + pricingCards(true) + '<div class="pricing-fine-print"><p><strong>Checkout total:</strong> AccessRevamp does not add a separate platform or processing surcharge. Any tax that is legally required must be disclosed before payment.</p><p><strong>Sandbox notice:</strong> ' + (siteConfig.checkoutIsSandbox ? 'The connected Stripe account is currently in test mode, so these links do not create a live charge.' : 'Live checkout is configured.') + '</p></div></div></section><section class="section section-tint"><div class="container faq-layout"><div><span class="eyebrow">Straight answers</span><h2>Pricing FAQ</h2><p>Important boundaries are visible before checkout—not buried after it.</p></div><div class="faq-list">' + faq('Is either plan a subscription?', 'No. Both services are one-time purchases. AccessRevamp does not enroll you in recurring billing.') + faq('Does $50 include implementation?', 'No. Homepage Reveal includes the reviewed report and completed homepage concept reveal. Implementation is part of the written Quick Fix scope.') + faq('Does $199 cover every possible website?', 'It covers the agreed revamp scope. Page count, platform access, third-party tools, content availability, and timing are confirmed in writing before work starts.') + faq('Do you guarantee legal compliance or perfect security?', 'No. We provide practical accessibility, usability, and passive security-hygiene observations. This is not legal advice, a compliance certification, or penetration testing.') + faq('Can I ask a question before paying?', 'Yes. Use the contact form and include your public website URL. No password or private access is needed for an initial conversation.') + '</div></div></section>');
}

const faq = (question, answer) => '<details><summary>' + escapeHtml(question) + '<span>+</span></summary><p>' + escapeHtml(answer) + '</p></details>';

function samplePage() {
  return shell('<section class="page-hero"><div class="container narrow"><span class="eyebrow">Illustrative sample</span><h1>Evidence first. Recommendations second.</h1><p class="lede">This example shows the format and level of reasoning—not findings about a real business.</p><div class="notice">Sample content is fictional and must not be treated as a completed audit or security assessment.</div></div></section><section class="section section-tight"><div class="container report-layout"><aside class="report-sidebar"><span class="micro-label">Sample report</span><h2>Northline Goods</h2><p>Illustrative direct-to-consumer storefront</p><dl><div><dt>Review type</dt><dd>Public homepage</dd></div><div><dt>Method</dt><dd>Passive + human review</dd></div><div><dt>Account access</dt><dd>Not used</dd></div><div><dt>Finding status</dt><dd>Illustrative</dd></div></dl><a class="button button-full" href="/pricing" data-nav>View service plans</a></aside><div class="report-main"><div class="report-summary"><div><span class="micro-label">Executive summary</span><h2>The offer is credible, but the first screen asks visitors to solve the hierarchy themselves.</h2><p>A stronger first screen would reduce competing messages, make the primary action unmistakable, and support it with one proof point.</p></div><div class="score-stack"><div><span>Priority</span><strong>High</strong></div><div><span>Confidence</span><strong>Reviewed</strong></div></div></div>' + finding('AR-01', 'High', 'Primary action competes with secondary navigation', 'The hero presents several similarly styled actions. Visitors may not know whether to shop, learn, subscribe, or browse first.', 'Visual hierarchy review at desktop and mobile widths.', 'Use one dominant action, demote supporting links, and keep the first-screen promise tied to the action.') + finding('AR-02', 'Medium', 'Muted text needs contrast verification', 'Supporting text appears light against a pale surface and may be difficult for some visitors to read.', 'Contrast should be measured against the final computed colors and states.', 'Raise foreground contrast and verify normal, hover, focus, and disabled states against the chosen WCAG target.') + finding('AR-03', 'Plan', 'Trust information arrives too late', 'Shipping, returns, and product proof are available, but visitors encounter them after the first major decision point.', 'Content order and purchase-friction review.', 'Bring one concise proof point or reassurance into the first-screen composition without overcrowding it.') + '<div class="concept-card"><div><span class="micro-label">Concept direction</span><h2>One promise, one proof point, one action.</h2><p>The reveal would show the complete visual composition, responsive behavior, content hierarchy, and recommended interaction states.</p></div><div class="concept-wire"><span class="wire-pill"></span><span class="wire-title"></span><span class="wire-title short"></span><span class="wire-copy"></span><span class="wire-copy short"></span><span class="wire-button"></span><div class="wire-proof"><i></i><i></i><i></i></div></div></div></div></div></section>');
}

function finding(id, severity, title, impact, evidence, recommendation) {
  return '<article class="report-finding"><div class="finding-head"><div><span class="finding-id">' + id + '</span><h3>' + title + '</h3></div><span class="severity ' + severity.toLowerCase() + '">' + severity + '</span></div><div class="finding-columns"><div><h4>Why it matters</h4><p>' + impact + '</p></div><div><h4>Evidence</h4><p>' + evidence + '</p></div><div><h4>Recommended direction</h4><p>' + recommendation + '</p></div></div></article>';
}

function methodologyPage() {
  return shell('<section class="page-hero"><div class="container narrow"><span class="eyebrow">Transparent methodology</span><h1>We separate observation, verification, and recommendation.</h1><p class="lede">A trustworthy report is as clear about its limits as it is about its findings.</p></div></section><section class="section section-tight"><div class="container methodology-grid"><article><span>01</span><h2>Public-surface intake</h2><p>We begin with a URL the business already makes public. No credentials, customer records, private files, or internal systems are requested for an initial review.</p></article><article><span>02</span><h2>Passive observation</h2><p>Checks are limited to normal public-page retrieval and visual review. We do not submit forms, create accounts, add items to carts, open checkout, probe admin routes, or attempt exploitation.</p></article><article><span>03</span><h2>Human verification</h2><p>Automated signals are treated as leads. A reviewer confirms the context, removes weak claims, and labels uncertainty before anything becomes customer-facing.</p></article><article><span>04</span><h2>Prioritization</h2><p>Items are ranked by likely visitor impact, confidence, effort, and dependency—not by dramatic language or an inflated issue count.</p></article><article><span>05</span><h2>Design direction</h2><p>The concept responds to the verified problems, brand context, platform constraints, and business goal rather than applying a generic visual template.</p></article><article><span>06</span><h2>Delivery and retest</h2><p>Implementation work follows the written scope. The delivered area is reviewed again and remaining limitations are documented.</p></article></div></section><section class="section section-tint"><div class="container split"><div><span class="eyebrow">What this is not</span><h2>Boundaries prevent misleading claims.</h2><p class="body-large">AccessRevamp is not a penetration test, legal certification, guaranteed revenue service, or substitute for a qualified accessibility or security professional.</p></div><ul class="boundary-list"><li>' + icon('lock') + '<div><strong>No credentialed access by default</strong><span>Private areas remain outside the initial review.</span></div></li><li>' + icon('eye') + '<div><strong>No active exploitation</strong><span>We do not test whether a vulnerability can be weaponized.</span></div></li><li>' + icon('shield') + '<div><strong>No absolute guarantees</strong><span>Recommendations reduce known friction; they do not promise perfect compliance, security, or sales.</span></div></li></ul></div></section>');
}

function outreachPage() {
  return shell('<section class="page-hero"><div class="container narrow"><span class="eyebrow">Responsible business outreach</span><h1>Relevant, limited, identifiable, and easy to stop.</h1><p class="lede">AccessRevamp outreach is designed around public business contact details, verified relevance, human approval, and permanent suppression after an opt-out.</p></div></section><section class="section section-tight"><div class="container standards-grid"><article><strong>20</strong><h2>Maximum approved messages per day</h2><p>The database enforces a daily ceiling across queued, scheduled, and sent first-touch messages.</p></article><article><strong>1:1</strong><h2>Business-specific context</h2><p>Each approved message names the public page reviewed and avoids generic claims that could apply to any storefront.</p></article><article><strong>0</strong><h2>Unverified security accusations</h2><p>Potential technical concerns remain internal until reviewed, and passive observations are never described as exploitation or proof of compromise.</p></article></div><div class="container policy-panel"><div><span class="eyebrow">Required before sending</span><h2>Every message must pass the same gates.</h2></div><ol><li><span>1</span>Recipient is a publicly listed business contact relevant to the website.</li><li><span>2</span>Source URL, public contact source, and review notes are recorded.</li><li><span>3</span>Claims are human approved and match available evidence.</li><li><span>4</span>Sender name, working reply address, business identity, and postal address are present.</li><li><span>5</span>A clear opt-out is included and checked against the permanent suppression list.</li></ol></div></section>');
}

function contactPage() {
  const emailLine = siteConfig.contactEmail ? '<p class="contact-email">Prefer email? <a href="mailto:' + escapeHtml(siteConfig.contactEmail) + '">' + escapeHtml(siteConfig.contactEmail) + '</a></p>' : '';
  return shell('<section class="page-hero"><div class="container narrow"><span class="eyebrow">Contact AccessRevamp</span><h1>Tell us what you want visitors to understand or do more easily.</h1><p class="lede">Share only public, non-sensitive information. Never send passwords, private customer data, access tokens, or payment details.</p>' + emailLine + '</div></section><section class="section section-tight"><div class="container contact-layout"><div class="contact-aside"><h2>Helpful context</h2><ul class="check-list"><li>Your public website URL</li><li>Your storefront platform, if known</li><li>The page or customer path that concerns you</li><li>Your preferred outcome</li></ul><div class="privacy-note">The form is rate-limited and stored in Supabase only after deployment variables are configured.</div></div><form class="contact-form card" data-contact-form novalidate><div class="field-row"><label>First name<input name="firstName" autocomplete="given-name" maxlength="80" required /></label><label>Last name<input name="lastName" autocomplete="family-name" maxlength="80" /></label></div><label>Business email<input type="email" name="email" autocomplete="email" maxlength="254" required /></label><label>Public website URL<input type="url" name="websiteUrl" inputmode="url" placeholder="https://" maxlength="2048" /></label><label>What would you like to improve?<textarea name="message" rows="6" minlength="20" maxlength="4000" required></textarea></label><label class="honeypot" aria-hidden="true">Company fax<input name="companyFax" tabindex="-1" autocomplete="off" /></label><label class="consent"><input type="checkbox" name="consent" required /><span>I agree that AccessRevamp may reply to this request. This does not subscribe me to marketing.</span></label><button class="button" type="submit">Send request ' + icon('arrow') + '</button><p class="form-status" role="status" aria-live="polite"></p></form></div></section>');
}

function authPage(mode) {
  const signup = mode === 'signup';
  return shell('<section class="auth-section"><div class="auth-card"><a class="brand centered" href="/" data-nav><span class="brand-mark">A</span><span>AccessRevamp</span></a><span class="eyebrow">Project workspace</span><h1>' + (signup ? 'Create your account' : 'Welcome back') + '</h1><p>' + (signup ? 'Use the email connected to your project or purchase.' : 'Sign in to view available project and order records.') + '</p><form data-auth-form data-mode="' + mode + '" novalidate>' + (signup ? '<label>Full name<input name="fullName" autocomplete="name" maxlength="120" required /></label>' : '') + '<label>Email<input type="email" name="email" autocomplete="email" required /></label><label>Password<input type="password" name="password" autocomplete="' + (signup ? 'new-password' : 'current-password') + '" minlength="10" required /></label><button class="button button-full" type="submit">' + (signup ? 'Create account' : 'Sign in') + '</button><p class="form-status" role="status" aria-live="polite"></p></form><p class="auth-switch">' + (signup ? 'Already have an account? <a href="/login" data-nav>Sign in</a>' : 'Need an account? <a href="/signup" data-nav>Create one</a>') + '</p><div class="auth-security">' + icon('shield') + '<span>Authentication is handled by Supabase. AccessRevamp never stores your password in application tables.</span></div></div></section>');
}

function dashboardPage() {
  return shell('<section class="dashboard-section"><div class="container"><div class="dashboard-head"><div><span class="eyebrow">Customer workspace</span><h1>Your AccessRevamp dashboard</h1><p data-dashboard-greeting>Checking your session…</p></div><button class="button button-ghost" type="button" data-logout hidden>Sign out</button></div><div data-dashboard-content><div class="loading-card"><span class="spinner"></span><p>Loading secure project data…</p></div></div></div></section>');
}

function legalPage(kind) {
  const pages = {
    privacy: ['Privacy notice', 'AccessRevamp collects the information you choose to provide through contact forms, account registration, and checkout. Account authentication is handled by Supabase and payment card details are handled by Stripe.', ['Contact submissions are used to answer your request.', 'Account and project records are used to deliver purchased work.', 'Payment event identifiers are stored to reconcile orders and prevent duplicate processing.', 'Outreach suppression records are retained so an opt-out remains effective.', 'We do not sell personal information or use customer passwords.']],
    terms: ['Service terms', 'AccessRevamp provides scoped design, accessibility, usability, and technical improvement services. A purchase starts the selected service only after required project information and access are available.', ['Homepage Reveal is a report and concept deliverable; it does not include implementation.', 'Quick Fix covers the implementation scope confirmed in writing before work begins.', 'Accessibility and security observations are not legal certification, penetration testing, or a guarantee of compliance.', 'Timelines may change when platform access, content, third-party tools, or approvals are delayed.', 'Refunds and cancellation requests are evaluated against work already completed and applicable law.']],
    accessibility: ['Accessibility statement', 'AccessRevamp aims to provide a perceivable, operable, understandable, and robust experience across common browsers, assistive technologies, and input methods.', ['The interface uses semantic structure, visible focus, keyboard navigation, reduced-motion support, readable contrast, and form status announcements.', 'Automated checks are paired with manual review; neither method alone proves complete conformance.', 'Tell us the page, task, assistive technology, and browser involved when reporting a barrier.', 'We will acknowledge a confirmed report and document the resolution or known limitation.']],
  };
  const [title, intro, items] = pages[kind];
  return shell('<section class="page-hero legal-hero"><div class="container narrow"><span class="eyebrow">Last updated July 17, 2026</span><h1>' + title + '</h1><p class="lede">' + intro + '</p></div></section><section class="section section-tight"><div class="container narrow legal-copy"><h2>Core commitments</h2><ul>' + items.map((item) => '<li>' + item + '</li>').join('') + '</ul><h2>Questions or requests</h2><p>Use the <a href="/contact" data-nav>contact form</a> and do not include passwords, card details, or other sensitive information. This public notice should be reviewed by qualified counsel before commercial launch.</p></div></section>');
}

function resultPage(success) {
  return shell('<section class="result-section"><div class="result-card"><div class="result-icon ' + (success ? 'success' : 'neutral') + '">' + icon(success ? 'check' : 'arrow') + '</div><span class="eyebrow">' + (success ? 'Checkout complete' : 'Checkout canceled') + '</span><h1>' + (success ? 'Thank you. Your next step is project intake.' : 'No payment was completed.') + '</h1><p>' + (success ? 'Stripe will send the payment receipt. Create or sign in to your workspace using the checkout email, then submit the public site and project context.' : 'Your plan selection has not been charged. You can return to pricing or ask a question before continuing.') + '</p><div class="hero-actions"><a class="button" href="' + (success ? '/signup' : '/pricing') + '" data-nav>' + (success ? 'Open workspace' : 'Return to pricing') + '</a><a class="button button-ghost" href="/contact" data-nav>Contact us</a></div></div></section>');
}

function notFoundPage() {
  return shell('<section class="result-section"><div class="result-card"><span class="eyebrow">404</span><h1>This page is not part of the current review.</h1><p>Return to the homepage or use the navigation to continue.</p><a class="button" href="/" data-nav>Go home</a></div></section>');
}

const pages = {
  '/': homePage,
  '/pricing': pricingPage,
  '/sample-report': samplePage,
  '/methodology': methodologyPage,
  '/outreach-standards': outreachPage,
  '/contact': contactPage,
  '/login': () => authPage('login'),
  '/signup': () => authPage('signup'),
  '/dashboard': dashboardPage,
  '/privacy': () => legalPage('privacy'),
  '/terms': () => legalPage('terms'),
  '/accessibility': () => legalPage('accessibility'),
  '/success': () => resultPage(true),
  '/cancel': () => resultPage(false),
};

function navigate(path) {
  if (path === location.pathname) return;
  history.pushState({}, '', path);
  render();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function bindNavigation() {
  document.querySelectorAll('[data-nav]').forEach((link) => link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    const url = new URL(link.href, location.origin);
    if (url.origin !== location.origin) return;
    event.preventDefault();
    navigate(url.pathname);
  }));
  const button = document.querySelector('.menu-button');
  const menu = document.querySelector('.mobile-nav');
  button?.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    button.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    button.innerHTML = icon(open ? 'menu' : 'close');
    menu.hidden = open;
  });
}

function bindContact() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    if (!form.reportValidity()) return;
    submit.disabled = true;
    status.textContent = 'Sending securely…';
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.consent = form.elements.consent.checked;
    try {
      const response = await fetch('/.netlify/functions/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to send the request.');
      form.reset();
      status.textContent = 'Received. We will reply using the email you provided.';
    } catch (error) {
      status.textContent = error.message === 'Failed to fetch' ? 'The contact backend is not configured on this preview yet. Please try again after deployment.' : error.message;
    } finally {
      submit.disabled = false;
    }
  });
}

function bindAuth() {
  const form = document.querySelector('[data-auth-form]');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    const supabase = getSupabase();
    if (!supabase) {
      status.textContent = 'Supabase is not connected on this deployment yet.';
      return;
    }
    if (!form.reportValidity()) return;
    submit.disabled = true;
    status.textContent = 'Working…';
    const data = new FormData(form);
    const email = String(data.get('email')).trim();
    const password = String(data.get('password'));
    const mode = form.dataset.mode;
    try {
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { data: { full_name: String(data.get('fullName') || '').trim() } } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === 'signup' && !result.data.session) {
        status.textContent = 'Check your email to confirm the account, then sign in.';
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      status.textContent = error.message || 'Authentication failed.';
    } finally {
      submit.disabled = false;
    }
  });
}

async function loadDashboard() {
  const host = document.querySelector('[data-dashboard-content]');
  if (!host) return;
  const greeting = document.querySelector('[data-dashboard-greeting]');
  const logout = document.querySelector('[data-logout]');
  const supabase = getSupabase();
  if (!supabase) {
    host.innerHTML = '<div class="empty-state"><h2>Workspace configuration pending</h2><p>This deployment needs its Supabase URL and publishable key before account data can load.</p><a class="button" href="/contact" data-nav>Contact AccessRevamp</a></div>';
    bindNavigation();
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    host.innerHTML = '<div class="empty-state"><h2>Sign in to continue</h2><p>Your project records are protected by row-level security.</p><a class="button" href="/login" data-nav>Sign in</a></div>';
    greeting.textContent = 'A secure session is required.';
    bindNavigation();
    return;
  }
  greeting.textContent = 'Signed in as ' + session.user.email;
  logout.hidden = false;
  logout.addEventListener('click', async () => { await supabase.auth.signOut(); navigate('/'); });
  const [projectsResult, ordersResult] = await Promise.all([
    supabase.from('customer_projects').select('id,name,status,plan_key,created_at,updated_at').order('created_at', { ascending: false }),
    supabase.from('orders').select('id,plan_key,amount_total,currency,status,created_at').order('created_at', { ascending: false }),
  ]);
  if (projectsResult.error || ordersResult.error) {
    host.innerHTML = '<div class="empty-state"><h2>Workspace is connected</h2><p>Your account is active, but project tables are not available to this deployment yet.</p></div>';
    return;
  }
  const projects = projectsResult.data || [];
  const orders = ordersResult.data || [];
  host.innerHTML = '<div class="dashboard-grid"><section class="dashboard-card"><div class="card-head"><div><span class="micro-label">Projects</span><h2>Current work</h2></div><span class="count-pill">' + projects.length + '</span></div>' + (projects.length ? '<div class="data-list">' + projects.map((project) => '<article><div><strong>' + escapeHtml(project.name) + '</strong><span>' + escapeHtml(plans[project.plan_key]?.name || project.plan_key) + '</span></div><span class="status-pill">' + escapeHtml(project.status) + '</span></article>').join('') + '</div>' : '<div class="empty-mini"><p>No project has been opened yet.</p><a href="/pricing" data-nav>View plans</a></div>') + '</section><section class="dashboard-card"><div class="card-head"><div><span class="micro-label">Orders</span><h2>Payment records</h2></div><span class="count-pill">' + orders.length + '</span></div>' + (orders.length ? '<div class="data-list">' + orders.map((order) => '<article><div><strong>' + escapeHtml(plans[order.plan_key]?.name || order.plan_key) + '</strong><span>' + new Date(order.created_at).toLocaleDateString() + '</span></div><span>' + new Intl.NumberFormat('en-US', { style: 'currency', currency: (order.currency || 'USD').toUpperCase() }).format((order.amount_total || 0) / 100) + '</span></article>').join('') + '</div>' : '<div class="empty-mini"><p>No completed order is linked to this account.</p></div>') + '</section></div>';
  bindNavigation();
}

function updateMeta() {
  const [title, description] = routeMeta[location.pathname] || ['Page not found', 'AccessRevamp'];
  document.title = title + ' | AccessRevamp';
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
}

function render() {
  const page = pages[location.pathname] || notFoundPage;
  app.innerHTML = page();
  updateMeta();
  bindNavigation();
  bindContact();
  bindAuth();
  loadDashboard();
}

window.addEventListener('popstate', render);
render();
`);

await write('src/styles.css', String.raw`
:root {
  color-scheme: dark;
  --ink: #eef5fb;
  --muted: #9eb0c3;
  --muted-strong: #c2cfda;
  --bg: #07111f;
  --bg-deep: #040b14;
  --panel: #0d1b2a;
  --panel-2: #112235;
  --line: rgba(188, 211, 230, .14);
  --line-strong: rgba(188, 211, 230, .25);
  --accent: #63e6d4;
  --accent-2: #8aa8ff;
  --accent-dark: #093b39;
  --danger: #ff927f;
  --warning: #ffd37a;
  --success: #82edb3;
  --white: #fff;
  --radius: 24px;
  --radius-small: 14px;
  --shadow: 0 32px 90px rgba(0, 0, 0, .34);
  --container: 1180px;
  font-family: Inter, Aptos, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* { box-sizing: border-box; }
html { background: var(--bg); scroll-behavior: smooth; }
body { margin: 0; min-width: 320px; background: var(--bg); color: var(--ink); line-height: 1.6; }
body::before { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: -2; background: radial-gradient(circle at 18% -10%, rgba(99,230,212,.12), transparent 32%), radial-gradient(circle at 88% 10%, rgba(138,168,255,.12), transparent 29%), linear-gradient(180deg, #081523 0%, #07111f 52%, #050d17 100%); }
body::after { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: -1; opacity: .32; background-image: linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px); background-size: 54px 54px; mask-image: linear-gradient(to bottom, black, transparent 72%); }
a { color: inherit; }
button, input, textarea { font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }
img, svg { display: block; max-width: 100%; }
::selection { background: rgba(99,230,212,.3); color: white; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
.skip-link { position: fixed; left: 16px; top: 12px; z-index: 100; transform: translateY(-180%); padding: 10px 14px; border-radius: 10px; background: white; color: #07111f; font-weight: 800; transition: transform .2s; }
.skip-link:focus { transform: translateY(0); }
.container { width: min(calc(100% - 40px), var(--container)); margin-inline: auto; }
.narrow { max-width: 820px; }
.section { padding: 112px 0; }
.section-tight { padding-top: 48px; }
.section-tint { border-block: 1px solid var(--line); background: linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.012)); }
.icon { width: 1.15em; height: 1.15em; flex: 0 0 auto; }

.site-header { position: sticky; top: 0; z-index: 50; border-bottom: 1px solid rgba(188,211,230,.1); background: rgba(7,17,31,.78); backdrop-filter: blur(18px); }
.nav-wrap { min-height: 76px; display: flex; align-items: center; justify-content: space-between; gap: 28px; }
.brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; font-weight: 850; letter-spacing: -.025em; }
.brand-mark { width: 34px; height: 34px; display: inline-grid; place-items: center; border: 1px solid rgba(99,230,212,.5); border-radius: 11px; background: linear-gradient(145deg, rgba(99,230,212,.22), rgba(138,168,255,.08)); color: var(--accent); box-shadow: inset 0 0 18px rgba(99,230,212,.06); }
.desktop-nav { display: flex; align-items: center; gap: 30px; }
.desktop-nav a, .text-link { color: var(--muted-strong); text-decoration: none; font-size: .94rem; font-weight: 650; }
.desktop-nav a:hover, .desktop-nav a[aria-current="page"], .text-link:hover { color: white; }
.nav-actions { display: flex; align-items: center; gap: 18px; }
.menu-button { display: none; border: 0; background: transparent; color: white; padding: 8px; }
.mobile-nav { border-top: 1px solid var(--line); padding: 12px 20px 20px; }
.mobile-nav nav { width: min(100%, var(--container)); margin: auto; display: grid; }
.mobile-nav a { padding: 12px 0; text-decoration: none; color: var(--muted-strong); border-bottom: 1px solid var(--line); }

.button { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 50px; padding: 0 22px; border: 1px solid transparent; border-radius: 14px; background: var(--accent); color: #041310; text-decoration: none; font-weight: 850; cursor: pointer; box-shadow: 0 10px 30px rgba(99,230,212,.13); transition: transform .2s, box-shadow .2s, background .2s; }
.button:hover { transform: translateY(-2px); box-shadow: 0 16px 38px rgba(99,230,212,.2); background: #7beedd; }
.button:disabled { opacity: .55; cursor: wait; transform: none; }
.button-small { min-height: 42px; padding-inline: 17px; border-radius: 12px; font-size: .9rem; }
.button-ghost { background: rgba(255,255,255,.035); color: var(--ink); border-color: var(--line-strong); box-shadow: none; }
.button-ghost:hover { background: rgba(255,255,255,.07); }
.button-full { width: 100%; }
.button-light { background: white; color: #07111f; box-shadow: none; }
.button-outline-light { color: white; border-color: rgba(255,255,255,.36); background: transparent; box-shadow: none; }
.text-arrow { display: inline-flex; align-items: center; gap: 8px; color: var(--accent); font-weight: 800; text-decoration: none; }
.text-arrow:hover { text-decoration: underline; text-underline-offset: 5px; }

.hero { padding-top: 100px; overflow: hidden; }
.hero-grid { display: grid; grid-template-columns: 1.03fr .97fr; gap: 76px; align-items: center; }
.eyebrow { display: inline-flex; align-items: center; gap: 10px; color: var(--accent); font-size: .75rem; font-weight: 850; letter-spacing: .15em; text-transform: uppercase; }
.eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 18px var(--accent); }
h1, h2, h3, p { margin-top: 0; }
h1 { margin: 20px 0 24px; font-size: clamp(3.2rem, 6.5vw, 5.9rem); line-height: .98; letter-spacing: -.066em; max-width: 900px; }
h2 { font-size: clamp(2rem, 4vw, 3.5rem); line-height: 1.08; letter-spacing: -.045em; }
h3 { font-size: 1.18rem; line-height: 1.25; letter-spacing: -.025em; }
.lede { max-width: 720px; color: var(--muted-strong); font-size: clamp(1.08rem, 2vw, 1.3rem); line-height: 1.7; }
.hero-copy .lede { max-width: 660px; }
.hero-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 13px; margin: 34px 0; }
.trust-row { display: flex; flex-wrap: wrap; gap: 10px 20px; color: var(--muted); font-size: .79rem; }
.trust-row span { display: inline-flex; align-items: center; gap: 6px; }
.trust-row .icon { color: var(--accent); }
.hero-visual { position: relative; border: 1px solid var(--line-strong); border-radius: 28px; background: linear-gradient(145deg, rgba(17,34,53,.96), rgba(9,22,36,.92)); box-shadow: var(--shadow); overflow: hidden; transform: perspective(1100px) rotateY(-3deg) rotateX(1deg); }
.hero-visual::before { content: ""; position: absolute; inset: -1px; border-radius: inherit; pointer-events: none; background: linear-gradient(135deg, rgba(99,230,212,.16), transparent 30%, transparent 70%, rgba(138,168,255,.11)); mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; padding: 1px; }
.window-bar { display: flex; align-items: center; gap: 7px; padding: 15px 18px; border-bottom: 1px solid var(--line); color: var(--muted); }
.window-bar span { width: 7px; height: 7px; border-radius: 50%; background: #365065; }
.window-bar em { margin-left: 8px; font-size: .72rem; font-style: normal; }
.score-panel { display: flex; align-items: center; justify-content: space-between; padding: 28px; border-bottom: 1px solid var(--line); }
.score-panel strong { display: block; margin-top: 5px; font-size: 1.35rem; }
.micro-label { color: var(--muted); font-size: .7rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.signal-ring { width: 82px; height: 82px; display: grid; place-content: center; text-align: center; border: 7px solid rgba(99,230,212,.16); border-top-color: var(--accent); border-radius: 50%; }
.signal-ring span { font-size: 1.4rem; font-weight: 850; line-height: 1; }
.signal-ring small { color: var(--muted); font-size: .55rem; }
.finding-list { padding: 8px 28px; }
.finding-list article { display: grid; grid-template-columns: 65px 1fr; gap: 16px; padding: 19px 0; border-bottom: 1px solid var(--line); }
.finding-list article:last-child { border-bottom: 0; }
.finding-list strong { font-size: .92rem; }
.finding-list p { margin: 5px 0 0; color: var(--muted); font-size: .75rem; line-height: 1.55; }
.severity { align-self: start; display: inline-flex; justify-content: center; padding: 4px 7px; border-radius: 999px; font-size: .61rem; font-weight: 850; text-transform: uppercase; }
.severity.high { color: #ffd2ca; background: rgba(255,146,127,.12); border: 1px solid rgba(255,146,127,.28); }
.severity.medium { color: #ffe5ae; background: rgba(255,211,122,.1); border: 1px solid rgba(255,211,122,.23); }
.severity.low, .severity.plan { color: #b9fff0; background: rgba(99,230,212,.1); border: 1px solid rgba(99,230,212,.24); }
.visual-footer { display: flex; justify-content: space-between; gap: 20px; padding: 16px 28px; border-top: 1px solid var(--line); background: rgba(0,0,0,.12); color: var(--muted); font-size: .68rem; }
.visual-footer span { display: inline-flex; align-items: center; gap: 6px; }

.logo-strip { padding: 28px 0; border-block: 1px solid var(--line); background: rgba(255,255,255,.015); }
.logo-strip .container { display: flex; align-items: center; justify-content: space-between; gap: 30px; }
.logo-strip p { margin: 0; color: var(--muted); font-size: .76rem; }
.logo-strip .container > div { display: flex; flex-wrap: wrap; gap: 24px; color: #cbd8e4; font-size: .79rem; font-weight: 750; }
.section-heading { max-width: 760px; margin-bottom: 46px; }
.section-heading h2 { margin: 14px 0; }
.section-heading p, .body-large { color: var(--muted-strong); font-size: 1.08rem; }
.pricing-heading { max-width: none; display: flex; align-items: end; justify-content: space-between; gap: 30px; }
.card-grid { display: grid; gap: 18px; }
.card-grid.three { grid-template-columns: repeat(3, 1fr); }
.feature-card, .card { border: 1px solid var(--line); border-radius: var(--radius); background: linear-gradient(145deg, rgba(17,34,53,.7), rgba(10,23,37,.62)); }
.feature-card { min-height: 290px; padding: 30px; }
.feature-card h3 { margin: 46px 0 13px; font-size: 1.3rem; }
.feature-card p { color: var(--muted); }
.feature-icon { display: inline-grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; background: rgba(99,230,212,.08); color: var(--accent); font-size: .72rem; font-weight: 850; }
.split { display: grid; grid-template-columns: .9fr 1.1fr; gap: 100px; align-items: start; }
.steps { list-style: none; margin: 0; padding: 0; }
.steps li { display: grid; grid-template-columns: 48px 1fr; gap: 20px; padding: 24px 0; border-bottom: 1px solid var(--line); }
.steps li:first-child { padding-top: 0; }
.steps li > span { width: 42px; height: 42px; display: grid; place-items: center; border: 1px solid var(--line-strong); border-radius: 13px; color: var(--accent); font-size: .8rem; font-weight: 850; }
.steps h3 { margin-bottom: 7px; }
.steps p { margin: 0; color: var(--muted); }

.pricing-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: stretch; }
.price-card { position: relative; display: flex; flex-direction: column; padding: 34px; border: 1px solid var(--line-strong); border-radius: 28px; background: linear-gradient(145deg, rgba(17,34,53,.88), rgba(9,21,34,.84)); overflow: hidden; }
.price-card.featured { border-color: rgba(99,230,212,.44); box-shadow: inset 0 0 60px rgba(99,230,212,.035); }
.recommended { position: absolute; right: 18px; top: 0; padding: 7px 12px; border-radius: 0 0 10px 10px; background: var(--accent); color: #041310; font-size: .66rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.price-top { display: flex; justify-content: space-between; gap: 20px; align-items: start; }
.plan-label { color: var(--accent); font-size: .68rem; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
.price-top h3 { margin-top: 7px; font-size: 1.45rem; }
.price { display: flex; flex-direction: column; align-items: end; }
.price strong { font-size: 2.5rem; letter-spacing: -.06em; }
.price small { color: var(--muted); }
.price-card > p { color: var(--muted-strong); min-height: 52px; }
.check-list { display: grid; gap: 12px; list-style: none; padding: 22px 0; margin: 0 0 12px; border-top: 1px solid var(--line); }
.check-list li { position: relative; padding-left: 24px; color: var(--muted-strong); }
.check-list li::before { content: "✓"; position: absolute; left: 0; color: var(--accent); font-weight: 900; }
.scope-note { min-height: 78px; margin: auto 0 20px; padding: 13px 15px; border-radius: 12px; background: rgba(0,0,0,.14); color: var(--muted); font-size: .75rem; }
.scope-note strong { color: var(--muted-strong); }
.sandbox-badge { display: block; width: fit-content; margin: 12px auto 0; padding: 4px 8px; border: 1px solid rgba(255,211,122,.25); border-radius: 999px; color: var(--warning); font-size: .64rem; font-weight: 800; }
.pricing-fine-print { margin-top: 24px; padding: 22px 26px; border: 1px solid var(--line); border-radius: 18px; color: var(--muted); font-size: .82rem; }
.pricing-fine-print p:last-child { margin-bottom: 0; }
.cta-panel { display: flex; align-items: center; justify-content: space-between; gap: 50px; padding: 52px; border-radius: 30px; background: linear-gradient(120deg, #104e4b, #263f76); box-shadow: var(--shadow); }
.cta-panel h2 { max-width: 700px; margin: 12px 0; }
.cta-panel p { max-width: 680px; margin-bottom: 0; color: rgba(255,255,255,.74); }
.cta-actions { display: flex; flex-direction: column; min-width: 190px; gap: 10px; }

.page-hero { padding: 110px 0 54px; text-align: center; }
.page-hero .container { margin-inline: auto; }
.page-hero h1 { font-size: clamp(2.8rem, 6vw, 5rem); margin-inline: auto; }
.page-hero .lede { margin-inline: auto; }
.notice { margin: 28px auto 0; padding: 13px 18px; border: 1px solid rgba(255,211,122,.24); border-radius: 13px; background: rgba(255,211,122,.06); color: #ffe5ae; font-size: .82rem; }
.faq-layout { display: grid; grid-template-columns: .7fr 1.3fr; gap: 90px; }
.faq-layout > div:first-child p { color: var(--muted); }
.faq-list details { border-bottom: 1px solid var(--line); }
.faq-list summary { display: flex; justify-content: space-between; gap: 20px; padding: 22px 0; cursor: pointer; font-weight: 750; list-style: none; }
.faq-list summary::-webkit-details-marker { display: none; }
.faq-list summary span { color: var(--accent); font-size: 1.4rem; }
.faq-list p { padding-right: 40px; color: var(--muted); }

.report-layout { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 28px; align-items: start; }
.report-sidebar { position: sticky; top: 104px; padding: 26px; border: 1px solid var(--line); border-radius: 22px; background: rgba(10,23,37,.8); }
.report-sidebar h2 { margin: 8px 0 5px; font-size: 1.6rem; }
.report-sidebar > p { color: var(--muted); font-size: .83rem; }
.report-sidebar dl { margin: 25px 0; }
.report-sidebar dl div { padding: 12px 0; border-bottom: 1px solid var(--line); }
.report-sidebar dt { color: var(--muted); font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; }
.report-sidebar dd { margin: 3px 0 0; font-weight: 700; font-size: .85rem; }
.report-main { display: grid; gap: 18px; }
.report-summary, .report-finding, .concept-card { border: 1px solid var(--line); border-radius: 24px; background: rgba(11,25,40,.78); }
.report-summary { display: grid; grid-template-columns: 1fr 150px; gap: 30px; padding: 32px; }
.report-summary h2 { margin: 10px 0 12px; font-size: 2rem; }
.report-summary p { color: var(--muted); }
.score-stack { display: grid; gap: 10px; }
.score-stack div { display: grid; place-content: center; padding: 14px; border-radius: 14px; background: rgba(255,255,255,.035); text-align: center; }
.score-stack span { color: var(--muted); font-size: .67rem; text-transform: uppercase; }
.score-stack strong { color: var(--accent); }
.report-finding { padding: 28px; }
.finding-head { display: flex; justify-content: space-between; gap: 20px; align-items: start; padding-bottom: 20px; border-bottom: 1px solid var(--line); }
.finding-id { color: var(--muted); font-size: .7rem; font-weight: 800; }
.finding-head h3 { margin: 5px 0 0; font-size: 1.28rem; }
.finding-columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding-top: 22px; }
.finding-columns h4 { margin: 0 0 7px; font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted-strong); }
.finding-columns p { margin: 0; color: var(--muted); font-size: .82rem; }
.concept-card { display: grid; grid-template-columns: 1fr .8fr; gap: 40px; padding: 34px; align-items: center; }
.concept-card h2 { margin: 10px 0; font-size: 2rem; }
.concept-card p { color: var(--muted); }
.concept-wire { min-height: 250px; padding: 25px; border: 1px solid var(--line); border-radius: 18px; background: linear-gradient(145deg, rgba(99,230,212,.07), rgba(138,168,255,.05)); }
.concept-wire > span { display: block; border-radius: 999px; background: rgba(238,245,251,.22); }
.wire-pill { width: 64px; height: 9px; margin-bottom: 26px; background: rgba(99,230,212,.42) !important; }
.wire-title { width: 90%; height: 15px; margin-bottom: 9px; }
.wire-title.short { width: 66%; }
.wire-copy { width: 80%; height: 7px; margin-top: 20px; }
.wire-copy.short { width: 57%; margin-top: 7px; }
.wire-button { width: 92px; height: 30px; margin-top: 24px; background: var(--accent) !important; }
.wire-proof { display: flex; gap: 8px; margin-top: 28px; }
.wire-proof i { width: 28%; height: 28px; border: 1px solid var(--line); border-radius: 7px; }

.methodology-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.methodology-grid article { min-height: 280px; padding: 28px; border: 1px solid var(--line); border-radius: 22px; background: rgba(12,27,43,.68); }
.methodology-grid article > span { color: var(--accent); font-size: .72rem; font-weight: 850; }
.methodology-grid h2 { margin: 44px 0 12px; font-size: 1.35rem; }
.methodology-grid p { color: var(--muted); }
.boundary-list { display: grid; gap: 12px; list-style: none; margin: 0; padding: 0; }
.boundary-list li { display: grid; grid-template-columns: 42px 1fr; gap: 14px; padding: 20px; border: 1px solid var(--line); border-radius: 16px; background: rgba(0,0,0,.08); }
.boundary-list .icon { width: 26px; height: 26px; color: var(--accent); }
.boundary-list strong, .boundary-list span { display: block; }
.boundary-list span { margin-top: 3px; color: var(--muted); font-size: .84rem; }
.standards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.standards-grid article { padding: 32px; border: 1px solid var(--line); border-radius: 24px; background: rgba(12,27,43,.68); }
.standards-grid strong { color: var(--accent); font-size: 3.4rem; letter-spacing: -.06em; }
.standards-grid h2 { margin: 28px 0 10px; font-size: 1.3rem; }
.standards-grid p { color: var(--muted); }
.policy-panel { display: grid; grid-template-columns: .75fr 1.25fr; gap: 70px; margin-top: 32px; padding: 40px; border: 1px solid var(--line); border-radius: 26px; background: rgba(255,255,255,.02); }
.policy-panel ol { list-style: none; margin: 0; padding: 0; counter-reset: policy; }
.policy-panel li { display: grid; grid-template-columns: 34px 1fr; gap: 13px; padding: 15px 0; border-bottom: 1px solid var(--line); color: var(--muted-strong); }
.policy-panel li span { width: 28px; height: 28px; display: grid; place-items: center; border: 1px solid var(--line-strong); border-radius: 9px; color: var(--accent); font-size: .7rem; font-weight: 850; }

.contact-layout { display: grid; grid-template-columns: .7fr 1.3fr; gap: 70px; }
.contact-aside h2 { font-size: 1.5rem; }
.contact-aside .check-list { border: 0; }
.privacy-note { padding: 18px; border: 1px solid var(--line); border-radius: 15px; color: var(--muted); font-size: .78rem; }
.contact-email { margin-top: 24px; color: var(--muted-strong); }
.contact-form { padding: 32px; }
.contact-form label, .auth-card label { display: grid; gap: 8px; margin-bottom: 18px; color: var(--muted-strong); font-size: .78rem; font-weight: 750; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
input, textarea { width: 100%; border: 1px solid var(--line-strong); border-radius: 12px; background: rgba(0,0,0,.18); color: white; padding: 13px 14px; transition: border-color .2s, background .2s; }
input:focus, textarea:focus { border-color: var(--accent); background: rgba(0,0,0,.28); outline: 0; box-shadow: 0 0 0 3px rgba(99,230,212,.1); }
textarea { resize: vertical; }
.consent { grid-template-columns: 18px 1fr !important; align-items: start; font-weight: 500 !important; }
.consent input { margin-top: 3px; }
.honeypot { position: absolute !important; left: -10000px !important; width: 1px !important; height: 1px !important; overflow: hidden !important; }
.form-status { min-height: 24px; margin: 13px 0 0; color: var(--muted-strong); font-size: .8rem; }

.auth-section, .result-section { min-height: calc(100vh - 76px); display: grid; place-items: center; padding: 70px 20px; }
.auth-card, .result-card { width: min(100%, 520px); padding: 38px; border: 1px solid var(--line-strong); border-radius: 28px; background: rgba(10,23,37,.9); box-shadow: var(--shadow); }
.brand.centered { display: flex; width: fit-content; margin: 0 auto 36px; }
.auth-card h1, .result-card h1 { margin: 12px 0 13px; font-size: 2.6rem; line-height: 1.05; letter-spacing: -.05em; }
.auth-card > p, .result-card > p { color: var(--muted); }
.auth-card form { margin-top: 28px; }
.auth-switch { margin: 20px 0; text-align: center; font-size: .83rem; }
.auth-switch a { color: var(--accent); }
.auth-security { display: grid; grid-template-columns: 24px 1fr; gap: 10px; padding: 15px; border-radius: 13px; background: rgba(99,230,212,.05); color: var(--muted); font-size: .72rem; }
.auth-security .icon { color: var(--accent); }
.result-card { text-align: center; }
.result-icon { width: 66px; height: 66px; display: grid; place-items: center; margin: 0 auto 24px; border-radius: 20px; background: rgba(99,230,212,.09); color: var(--accent); }
.result-icon .icon { width: 30px; height: 30px; }
.result-card .hero-actions { justify-content: center; }

.dashboard-section { min-height: 70vh; padding: 80px 0 120px; }
.dashboard-head { display: flex; justify-content: space-between; gap: 30px; align-items: end; margin-bottom: 34px; }
.dashboard-head h1 { margin: 12px 0; font-size: 3.4rem; }
.dashboard-head p { color: var(--muted); }
.loading-card, .empty-state { min-height: 300px; display: grid; place-content: center; justify-items: center; text-align: center; padding: 40px; border: 1px solid var(--line); border-radius: 24px; background: rgba(10,23,37,.65); }
.spinner { width: 34px; height: 34px; border: 3px solid var(--line-strong); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.dashboard-card { min-height: 330px; padding: 28px; border: 1px solid var(--line); border-radius: 24px; background: rgba(10,23,37,.68); }
.card-head { display: flex; justify-content: space-between; gap: 20px; align-items: start; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
.card-head h2 { margin: 5px 0 0; font-size: 1.4rem; }
.count-pill, .status-pill { padding: 5px 9px; border-radius: 999px; background: rgba(99,230,212,.09); color: var(--accent); font-size: .68rem; font-weight: 800; }
.data-list article { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 17px 0; border-bottom: 1px solid var(--line); }
.data-list article div { display: grid; }
.data-list article span { color: var(--muted); font-size: .76rem; }
.empty-mini { padding: 55px 0; text-align: center; color: var(--muted); }
.empty-mini a { color: var(--accent); }

.legal-hero { padding-bottom: 30px; }
.legal-copy { padding: 30px; border: 1px solid var(--line); border-radius: 24px; background: rgba(10,23,37,.62); }
.legal-copy h2 { margin: 35px 0 12px; font-size: 1.5rem; }
.legal-copy h2:first-child { margin-top: 0; }
.legal-copy p, .legal-copy li { color: var(--muted-strong); }
.legal-copy li { margin-bottom: 11px; }

.site-footer { padding: 72px 0 28px; border-top: 1px solid var(--line); background: rgba(3,9,16,.54); }
.footer-grid { display: grid; grid-template-columns: 1.5fr .7fr .7fr 1fr; gap: 50px; }
.footer-grid > div:first-child p { max-width: 310px; margin-top: 18px; color: var(--muted); font-size: .82rem; }
.footer-grid h2 { font-size: .73rem; letter-spacing: .11em; text-transform: uppercase; color: var(--muted); }
.footer-grid > div:not(:first-child) a { display: block; margin: 11px 0; color: var(--muted-strong); text-decoration: none; font-size: .82rem; }
.footer-note { align-self: start; display: flex; gap: 10px; padding: 15px; border: 1px solid var(--line); border-radius: 14px; color: var(--muted); font-size: .72rem; }
.status-dot { width: 8px; height: 8px; flex: 0 0 auto; margin-top: 5px; border-radius: 50%; background: var(--success); box-shadow: 0 0 15px rgba(130,237,179,.6); }
.footer-bottom { display: flex; justify-content: space-between; gap: 30px; margin-top: 55px; padding-top: 24px; border-top: 1px solid var(--line); color: var(--muted); font-size: .7rem; }

@media (max-width: 980px) {
  .desktop-nav, .hide-small { display: none; }
  .menu-button { display: block; }
  .hero-grid, .split, .faq-layout, .contact-layout, .policy-panel { grid-template-columns: 1fr; gap: 55px; }
  .hero-visual { transform: none; max-width: 700px; }
  .card-grid.three, .methodology-grid, .standards-grid { grid-template-columns: repeat(2, 1fr); }
  .report-layout { grid-template-columns: 1fr; }
  .report-sidebar { position: static; }
  .footer-grid { grid-template-columns: 1.5fr 1fr 1fr; }
  .footer-note { grid-column: 1 / -1; }
}

@media (max-width: 720px) {
  .container { width: min(calc(100% - 28px), var(--container)); }
  .section { padding: 78px 0; }
  .hero { padding-top: 72px; }
  h1 { font-size: clamp(2.75rem, 14vw, 4.4rem); }
  .pricing-grid, .card-grid.three, .methodology-grid, .standards-grid, .dashboard-grid, .finding-columns, .concept-card, .report-summary { grid-template-columns: 1fr; }
  .pricing-heading, .cta-panel, .dashboard-head, .logo-strip .container { align-items: start; flex-direction: column; }
  .cta-panel { padding: 32px; }
  .cta-actions { width: 100%; }
  .hero-actions .button, .cta-actions .button { width: 100%; }
  .hero-visual { border-radius: 21px; }
  .score-panel, .finding-list, .visual-footer { padding-inline: 18px; }
  .visual-footer { flex-direction: column; gap: 5px; }
  .price-card { padding: 25px; }
  .price-top { flex-direction: column; }
  .price { align-items: start; }
  .field-row { grid-template-columns: 1fr; gap: 0; }
  .contact-form, .auth-card, .result-card { padding: 25px; }
  .page-hero { padding-top: 78px; }
  .report-summary { gap: 18px; }
  .score-stack { grid-template-columns: 1fr 1fr; }
  .concept-card { gap: 20px; }
  .policy-panel { padding: 28px; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
  .footer-grid > div:first-child, .footer-note { grid-column: 1 / -1; }
  .footer-bottom { flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
`);

console.log('AccessRevamp frontend generated.');
