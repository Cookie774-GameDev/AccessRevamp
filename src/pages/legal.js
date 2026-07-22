import { refundPolicy } from '../data/policies.js';
import { shell } from '../components/shell.js';

const pages = {
  privacy: {
    title: 'Privacy notice',
    intro: 'AccessRevamp collects only the information you choose to provide through contact, account, project, approval, and checkout journeys.',
    items: ['Contact submissions are used to answer your request.', 'Supabase handles authentication and protects customer records with row-level security.', 'Stripe handles payment-card details; AccessRevamp stores only the identifiers needed to reconcile orders.', 'Project research, uploaded references, approval choices, and delivery records are kept within the customer project and are not made public by default.', 'Suppression records may be retained so an outreach opt-out remains effective.', 'Personal information is not sold.'],
  },
  terms: {
    title: 'Service terms',
    intro: 'Every AccessRevamp purchase is governed by the selected plan, the confirmed intake, customer approvals, and the written delivery scope.',
    items: ['Homepage Reveal includes a human-reviewed report, growth guidance, and five homepage directions—three normal and two cinematic—unless the written scope says otherwise.', 'Complete Website Revamp covers up to five agreed standard content pages, approved implementation, up to two design-option revision rounds, five animated poster directions, ten still poster directions, and the written delivery scope.', 'Cinematic Scroll Site includes the Complete Website Revamp process plus a customer-selected three- or four-scene sequence, two complete visual sequence options, accessible reduced-motion fallbacks, and provider-credit limits stated during intake.', 'AI-assisted concepts may be used during ideation. Final website media must be customer-owned, properly licensed, or separately approved; AccessRevamp does not promise unreviewed generated imagery in the published site.', 'Accessibility and security observations are not certification, penetration testing, or legal advice. Active security testing requires separate written authorization defining the exact target and scope.', 'Timelines may change when access, assets, content, third-party tools, customer approvals, or provider availability are delayed.', 'Purchase does not automatically grant portfolio rights. Portfolio publication requires a separate optional permission, excludes sensitive material, and may be revoked for future use.'],
  },
  accessibility: {
    title: 'Accessibility statement',
    intro: 'AccessRevamp aims to provide a perceivable, operable, understandable, and robust public and customer experience.',
    items: ['The interface uses semantic structure, keyboard navigation, visible focus, readable contrast, reduced-motion support, and announced form status.', 'Automated checks are paired with manual review; neither alone proves full conformance.', 'When reporting a barrier, include the page, task, browser, and assistive technology if comfortable.', 'Confirmed issues are documented with a resolution or known limitation.'],
  },
  legal: {
    title: 'Legal overview',
    intro: 'The public policies explain how AccessRevamp handles service scope, privacy, accessibility, outreach, portfolio permission, and refunds.',
    items: ['Review privacy before sharing personal information.', 'Review terms and the written project scope before purchasing.', 'Review the refund policy before final digital delivery.', 'Portfolio permission is separate from purchase and is not required.', 'These public notices should receive qualified legal review before commercial launch.'],
  },
  outreach: {
    title: 'Outreach standards',
    intro: 'Business outreach must be relevant, limited, identifiable, evidence-backed, human-approved, and easy to stop.',
    items: ['Only intentionally published business contact details may be used, and the exact public source must be recorded.', 'Every message must be based on a human-verified observation from the reviewed public page and remain at or below the configured 175-word maximum.', 'Unverified security concerns, legal threats, fake reply subjects, and invented business claims are never used.', 'A working reply address, accurate sender identity, valid postal address, and clear reply-or-link opt-out are required.', 'Suppressed recipients remain excluded from future sends, and automated spam-classification manipulation is prohibited.'],
  },
};

export function legalPage(kind) {
  if (kind === 'refunds') {
    return shell(`<section class="page-hero"><div class="container-narrow"><span class="eyebrow">Last updated July 21, 2026</span><h1>${refundPolicy.title}</h1><p class="lede">${refundPolicy.summary}</p></div></section><section class="section"><div class="container-narrow legal-copy"><h2>Before final delivery</h2><p>${refundPolicy.delivery}</p><h2>Cinematic timing</h2><p>${refundPolicy.timing}</p><h2>Rights preserved</h2><p>${refundPolicy.rights}</p><p>Use the <a href="/contact" data-nav>contact form</a> to request cancellation or a refund and include only non-sensitive project context.</p></div></section>`, { pathname: '/refunds' });
  }
  const page = pages[kind] || pages.legal;
  return shell(`<section class="page-hero"><div class="container-narrow"><span class="eyebrow">Last updated July 21, 2026</span><h1>${page.title}</h1><p class="lede">${page.intro}</p></div></section><section class="section"><div class="container-narrow legal-copy"><h2>Core commitments</h2><ul>${page.items.map((item) => `<li>${item}</li>`).join('')}</ul><h2>Questions or requests</h2><p>Use the <a href="/contact" data-nav>contact form</a>. Never include passwords, card details, or access tokens.</p></div></section>`, { pathname: kind === 'outreach' ? '/outreach-standards' : `/${kind}` });
}
