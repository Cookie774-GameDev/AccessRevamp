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
  '/outreach-standards': ['Outreach standards', 'How AccessRevamp keeps business outreach relevant, accurate, human-approved, and easy to stop.'],
  '/contact': ['Contact', 'Tell AccessRevamp what you want to improve.'],
  '/login': ['Sign in', 'Access your AccessRevamp project workspace.'],
  '/signup': ['Create an account', 'Create your AccessRevamp project workspace.'],
  '/forgot-password': ['Recover account', 'Request a one-time AccessRevamp recovery email and choose a new password.'],
  '/recover-account': ['Recover account', 'Verify your AccessRevamp recovery code and choose a new password.'],
  '/account/projects': ['Projects', 'View your AccessRevamp projects and orders.'],
  '/project-intake': ['Project brief', 'Choose pages, share references, and upload private visual direction for a verified Complete or Cinematic project.'],
  '/approve/:token': ['Private project approval', 'Review and confirm one AccessRevamp project direction through a private, expiring link.'],
  '/dashboard': ['Dashboard', 'View your AccessRevamp projects and orders.'],
  '/operator': ['Operator workspace', 'Restricted AccessRevamp evidence, preview, delivery, refund, and queue operations.'],
  '/privacy': ['Privacy Policy', 'How AccessRevamp collects, uses, shares, secures, and retains account, project, order, and support information.'],
  '/policy': ['Customer Service Policy', 'How AccessRevamp handles scope, communication, revisions, approvals, private delivery, and customer concerns.'],
  '/terms': ['Terms of Service', 'The legal terms for AccessRevamp accounts, orders, content rights, service standards, and liability.'],
  '/accessibility': ['Accessibility Statement', 'The AccessRevamp accessibility commitment, testing approach, and support channel.'],
  '/refunds': ['Refund Policy', 'How cancellation and refund requests are reviewed before and after final digital delivery.'],
  '/legal': ['Policy Center', 'AccessRevamp privacy, customer, service, refund, accessibility, outreach, and support information.'],
  '/support': ['Customer Support', 'Get AccessRevamp help with accounts, orders, project progress, videos, files, privacy, and accessibility.'],
  '/customer-support': ['Customer Support', 'Get AccessRevamp help with accounts, orders, project progress, videos, files, privacy, and accessibility.'],
  '/cinematic-scroll': ['Cinematic evidence story', 'Move from scattered signals through verified evidence and redesigned hierarchy to one clear action.'],
  '/success': ['Payment verification', 'Verify the durable AccessRevamp order created by a signed Stripe webhook.'],
  '/cancel': ['Checkout return', 'Return safely from Stripe Checkout without assuming a payment result.'],
  '/preview/:token': ['Private preview', 'A private AccessRevamp review preview.'],
});

const noIndexPatterns = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/recover-account',
  '/account/projects',
  '/project-intake',
  '/approve/:token',
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
