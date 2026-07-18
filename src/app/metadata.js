export const routeMetadata = Object.freeze({
  '/': ['Storefront revamps with a point of view', 'AccessRevamp finds storefront friction, clarifies the offer, and builds a stronger one-time direction.'],
  '/work': ['Selected work', 'Explore original AccessRevamp homepage, campaign, and cinematic concepts.'],
  '/work/:slug': ['Project story', 'Explore the thinking behind an original AccessRevamp concept.'],
  '/services': ['Services', 'Choose a free snapshot, focused reveal, complete website revamp, or cinematic scroll site.'],
  '/process': ['Process', 'See how AccessRevamp moves from public evidence to a human-reviewed direction.'],
  '/pricing': ['One-time pricing', 'Four clear AccessRevamp tiers with cumulative credit and no recurring platform fee.'],
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
  '/refunds': ['Refund policy', 'How cancellation and refund requests are handled before final digital delivery.'],
  '/legal': ['Legal overview', 'AccessRevamp public policies and service boundaries.'],
  '/cinematic-scroll': ['Cinematic scroll concept', 'Direct the Aether One concept through a scroll-controlled product story.'],
  '/success': ['Payment received', 'Your AccessRevamp checkout was completed.'],
  '/cancel': ['Checkout canceled', 'No AccessRevamp payment was completed.'],
});

export function updateDocumentMetadata(pathname, pattern = pathname) {
  const [title, description] = routeMetadata[pattern] || ['Page not found', 'AccessRevamp'];
  document.title = `${title} | AccessRevamp`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
}
