export const routeMetadata = Object.freeze({
  '/': ['Storefront revamps with a point of view', 'AccessRevamp finds storefront friction, clarifies the offer, and builds a stronger one-time direction.'],
  '/portfolio': ['Portfolio', 'Explore original AccessRevamp concepts and the production demonstration preview.'],
  '/portfolio/:slug': ['Original working demonstration', 'Explore a responsive, accessible AccessRevamp interaction demonstration with safe sample behavior.'],
  '/work': ['Selected work', 'Explore original AccessRevamp homepage, campaign, and cinematic concepts.'],
  '/work/:slug': ['Project story', 'Explore the thinking behind an original AccessRevamp concept.'],
  '/services': ['Services', 'Choose a free snapshot, focused reveal, complete website revamp, or cinematic scroll site.'],
  '/process': ['Process', 'See how AccessRevamp moves from public evidence to a human-reviewed direction.'],
  '/pricing': ['One-time pricing', 'Four clear AccessRevamp tiers with cumulative credit and no recurring platform fee.'],
  '/free-snapshot': ['Free snapshot', 'Request one bounded, human-reviewed observation from a public HTTPS page.'],
  '/sample-report': ['Sample report', 'See how AccessRevamp documents evidence, impact, and repair priorities.'],
  '/methodology': ['Methodology', 'A transparent, passive, human-reviewed assessment process.'],
  '/outreach-standards': ['Outreach standards', 'How AccessRevamp keeps business outreach relevant, accurate, and easy to stop.'],
  '/contact': ['Contact', 'Tell AccessRevamp what you want to improve.'],
  '/login': ['Sign in', 'Access your AccessRevamp project workspace.'],
  '/signup': ['Create an account', 'Create your AccessRevamp project workspace.'],
  '/account/projects': ['Projects', 'View your AccessRevamp projects and orders.'],
  '/project-intake': ['Project brief', 'Choose pages, share references, and upload private visual direction for a verified Complete or Cinematic project.'],
  '/dashboard': ['Dashboard', 'View your AccessRevamp projects and orders.'],
  '/operator': ['Operator workspace', 'Restricted AccessRevamp evidence, preview, delivery, refund, and queue operations.'],
  '/privacy': ['Privacy', 'How AccessRevamp handles contact, account, and order information.'],
  '/terms': ['Terms', 'AccessRevamp service terms.'],
  '/accessibility': ['Accessibility statement', 'Our commitment to an accessible AccessRevamp experience.'],
  '/refunds': ['Refund policy', 'How cancellation and refund requests are handled before final digital delivery.'],
  '/legal': ['Legal overview', 'AccessRevamp public policies and service boundaries.'],
  '/cinematic-scroll': ['Cinematic evidence story', 'Move from scattered signals through verified evidence and redesigned hierarchy to one clear action.'],
  '/success': ['Payment verification', 'Verify the durable AccessRevamp order created by a signed Stripe webhook.'],
  '/cancel': ['Checkout return', 'Return safely from Stripe Checkout without assuming a payment result.'],
  '/preview/:token': ['Private preview', 'A private AccessRevamp review preview.'],
});

const noIndexPatterns = new Set([
  '/login',
  '/signup',
  '/account/projects',
  '/project-intake',
  '/dashboard',
  '/operator',
  '/success',
  '/cancel',
  '/preview/:token',
]);

export function updateDocumentMetadata(pathname, pattern = pathname) {
  const [title, description] = routeMetadata[pattern] || ['Page not found', 'AccessRevamp'];
  document.title = `${title} | AccessRevamp`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector('meta[name="robots"]')?.setAttribute(
    'content',
    noIndexPatterns.has(pattern) ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large',
  );
}
