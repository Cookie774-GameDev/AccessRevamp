import { refundPolicy } from '../data/policies.js';
import { shell } from '../components/shell.js';

const pages = {
  privacy: {
    title: 'Privacy notice',
    intro: 'AccessRevamp collects only the information you choose to provide through contact, account, project, and checkout journeys.',
    items: ['Contact submissions are used to answer your request.', 'Supabase handles authentication and protects customer records with row-level security.', 'Stripe handles payment-card details; AccessRevamp stores only the identifiers needed to reconcile orders.', 'Suppression records may be retained so an outreach opt-out remains effective.', 'Personal information is not sold.'],
  },
  terms: {
    title: 'Service terms',
    intro: 'Every AccessRevamp purchase is governed by the selected plan and the written scope confirmed for delivery.',
    items: ['Homepage Reveal includes a reviewed report and one landing-page direction; its written scope states whether delivery is coded, conceptual, or both.', 'Complete Website Revamp covers up to five agreed standard content pages unless written scope says otherwise.', 'Cinematic Scroll Site is bounded to one sequence, up to four story beats, one revision, and accessible fallbacks.', 'Accessibility and security observations are not certification, penetration testing, or legal advice.', 'Timelines may change when access, assets, content, third-party tools, or approvals are delayed.'],
  },
  accessibility: {
    title: 'Accessibility statement',
    intro: 'AccessRevamp aims to provide a perceivable, operable, understandable, and robust public and customer experience.',
    items: ['The interface uses semantic structure, keyboard navigation, visible focus, readable contrast, reduced-motion support, and announced form status.', 'Automated checks are paired with manual review; neither alone proves full conformance.', 'When reporting a barrier, include the page, task, browser, and assistive technology if comfortable.', 'Confirmed issues are documented with a resolution or known limitation.'],
  },
  legal: {
    title: 'Legal overview',
    intro: 'The public policies explain how AccessRevamp handles service scope, privacy, accessibility, and refunds.',
    items: ['Review privacy before sharing personal information.', 'Review terms and the written project scope before purchasing.', 'Review the refund policy before final digital delivery.', 'These public notices should receive qualified legal review before commercial launch.'],
  },
  outreach: {
    title: 'Outreach standards',
    intro: 'Business outreach must be relevant, limited, identifiable, evidence-backed, human-approved, and easy to stop.',
    items: ['Only publicly listed business contact details may be used.', 'The reviewed public page and contact source must be recorded.', 'Unverified security concerns are never used as scare claims.', 'A working reply address, business identity, postal address, and clear opt-out are required.', 'Suppressed recipients remain excluded from future sends.'],
  },
};

export function legalPage(kind) {
  if (kind === 'refunds') {
    return shell(`<section class="page-hero"><div class="container-narrow"><span class="eyebrow">Last updated July 17, 2026</span><h1>${refundPolicy.title}</h1><p class="lede">${refundPolicy.summary}</p></div></section><section class="section"><div class="container-narrow legal-copy"><h2>Before final delivery</h2><p>${refundPolicy.delivery}</p><h2>Cinematic timing</h2><p>${refundPolicy.timing}</p><h2>Rights preserved</h2><p>${refundPolicy.rights}</p><p>Use the <a href="/contact" data-nav>contact form</a> to request cancellation or a refund and include only non-sensitive project context.</p></div></section>`, { pathname: '/refunds' });
  }
  const page = pages[kind] || pages.legal;
  return shell(`<section class="page-hero"><div class="container-narrow"><span class="eyebrow">Last updated July 17, 2026</span><h1>${page.title}</h1><p class="lede">${page.intro}</p></div></section><section class="section"><div class="container-narrow legal-copy"><h2>Core commitments</h2><ul>${page.items.map((item) => `<li>${item}</li>`).join('')}</ul><h2>Questions or requests</h2><p>Use the <a href="/contact" data-nav>contact form</a>. Never include passwords, card details, or access tokens.</p></div></section>`, { pathname: kind === 'outreach' ? '/outreach-standards' : `/${kind}` });
}
