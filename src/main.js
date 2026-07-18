import './styles.css';
import { plans, siteConfig, servicePromise } from './config.js';
import { getSupabase } from './lib/supabase.js';
import { createRouter } from './app/router.js';
import { updateDocumentMetadata } from './app/metadata.js';

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
  return shell('<section class="page-hero"><div class="container narrow"><span class="eyebrow">Transparent methodology</span><h1>We separate observation, verification, and recommendation.</h1><p class="lede">A trustworthy report is as clear about its limits as it is about its findings.</p></div></section><section class="section section-tight"><div class="container methodology-grid"><article><span>01</span><h2>Public-surface intake</h2><p>We begin with a URL the business already makes public. No credentials, customer records, private files, or internal systems are requested for an initial review.</p></article><article><span>02</span><h2>Passive observation</h2><p>Checks are limited to normal public-page retrieval and visual review. We do not submit forms, create accounts, add items to carts, open checkout, probe admin routes, or attempt exploitation.</p></article><article><span>03</span><h2>Human verification</h2><p>Automated signals are treated as leads. A reviewer confirms the context, removes weak claims, and labels uncertainty before anything becomes customer-facing.</p></article><article><span>04</span><h2>Prioritization</h2><p>Items are ranked by likely visitor impact, confidence, effort, and dependency—not by dramatic language or an inflated issue count.</p></article><article><span>05</span><h2>Design direction</h2><p>The concept responds to the verified problems, brand context, platform constraints, and business goal rather than applying a generic visual template.</p></article><article><span>06</span><h2>Delivery and retest</h2><p>Implementation work follows the written scope. The delivered area is reviewed again and remaining limitations are documented.</p></article></div></section><section class="section section-tint"><div class="container split"><div><span class="eyebrow">What this is not</span><h2>Boundaries prevent misleading claims.</h2><p class="body-large">AccessRevamp is not a penetration test, legal certification, a promise of increased revenue, or substitute for a qualified accessibility or security professional.</p></div><ul class="boundary-list"><li>' + icon('lock') + '<div><strong>No credentialed access by default</strong><span>Private areas remain outside the initial review.</span></div></li><li>' + icon('eye') + '<div><strong>No active exploitation</strong><span>We do not test whether a vulnerability can be weaponized.</span></div></li><li>' + icon('shield') + '<div><strong>No absolute guarantees</strong><span>Recommendations reduce known friction; they do not promise perfect compliance, security, or sales.</span></div></li></ul></div></section>');
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

let router;
const navigate = (path) => router.navigate(path);

function bindNavigation() {
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

function renderRoute({ pathname, pattern, params, view }) {
  app.innerHTML = view(params);
  updateDocumentMetadata(pathname, pattern);
  bindNavigation();
  bindContact();
  bindAuth();
  loadDashboard();
}

router = createRouter({ routes: pages, fallback: notFoundPage, render: renderRoute });
router.start();
