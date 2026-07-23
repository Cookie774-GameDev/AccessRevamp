import '../styles/legal-support.css';
import { refundPolicy } from '../data/policies.js';
import { shell } from '../components/shell.js';

export const SUPPORT_EMAIL = 'support.accessrevamp.com@gmail.com';
export const LEGAL_LAST_UPDATED = 'July 22, 2026';

const routeFor = Object.freeze({
  legal: '/legal',
  privacy: '/privacy',
  policy: '/policy',
  terms: '/terms',
  refunds: '/refunds',
  accessibility: '/accessibility',
  outreach: '/outreach-standards',
  support: '/support',
});

const policyLinks = [
  ['legal', 'Policy center'],
  ['privacy', 'Privacy policy'],
  ['policy', 'Customer policy'],
  ['terms', 'Terms of service'],
  ['refunds', 'Refund policy'],
  ['accessibility', 'Accessibility'],
  ['support', 'Customer support'],
];

const mailto = `mailto:${SUPPORT_EMAIL}`;

const pages = {
  privacy: {
    kicker: 'Privacy policy',
    title: 'Your information stays connected to your work—not someone else’s advertising business.',
    intro: 'This Privacy Policy explains what AccessRevamp collects, why it is used, when it may be shared, how long it is kept, and the choices available to you.',
    summary: [
      ['No data sales', 'AccessRevamp does not sell personal information or use customer project files for third-party advertising.'],
      ['Private project records', 'Account, brief, reference, design, delivery, and download records are restricted to the relevant customer and authorized operators.'],
      ['Payment separation', 'Full payment-card details are handled by the payment processor and are not stored in the AccessRevamp customer database.'],
    ],
    sections: [
      {
        id: 'scope',
        title: '1. Scope and who controls the information',
        paragraphs: [
          'This policy applies to accessrevamp.com, AccessRevamp account and customer-workspace pages, project intake, support communications, checkout-related records, and files delivered through the service.',
          'AccessRevamp is the controller of personal information described in this policy unless a project-specific agreement states otherwise. Third-party websites and services have their own privacy notices.',
        ],
      },
      {
        id: 'collection',
        title: '2. Information we collect',
        bullets: [
          '<strong>Contact information:</strong> name, email address, company, website URL, and the details included in a contact or support request.',
          '<strong>Account information:</strong> account identifier, confirmed email status, session and security records, and profile information you provide.',
          '<strong>Project information:</strong> briefs, selected pages, goals, written requests, reference URLs, uploaded images, design choices, approvals, revisions, progress updates, and delivery files.',
          '<strong>Order information:</strong> plan, amount, currency, order status, processor references, refunds, and delivery entitlement. AccessRevamp does not receive or store your full card number or card security code.',
          '<strong>Technical and security information:</strong> IP-derived security signals, browser or device information supplied in requests, timestamps, authentication events, rate-limit records, and server logs used to protect the service.',
          '<strong>Communications:</strong> messages sent to support, responses, and records needed to resolve an account, project, privacy, accessibility, or billing request.',
        ],
      },
      {
        id: 'use',
        title: '3. How information is used',
        bullets: [
          'Create and secure accounts, confirm email ownership, authenticate sign-ins, and prevent abuse.',
          'Provide purchased services, prepare project work, request approvals, publish progress, deliver files, and maintain download access.',
          'Process and reconcile orders, refunds, disputes, accounting records, and fraud-prevention checks.',
          'Answer support, privacy, accessibility, and legal requests.',
          'Maintain, troubleshoot, measure, and improve reliability, performance, usability, and security.',
          'Comply with applicable law, enforce service terms, protect users, and establish or defend legal claims.',
        ],
      },
      {
        id: 'basis',
        title: '4. Legal bases where required',
        paragraphs: [
          'Where privacy law requires a legal basis, AccessRevamp generally processes information to perform a contract or take requested pre-contract steps, comply with legal obligations, pursue legitimate interests such as service security and support, or act on consent. Consent may be withdrawn where consent is the basis, without affecting earlier lawful processing.',
        ],
      },
      {
        id: 'sharing',
        title: '5. When information may be shared',
        bullets: [
          'With service providers that supply hosting, authentication, private file storage, email delivery, payment processing, monitoring, and other infrastructure needed to operate AccessRevamp.',
          'With professional advisers, auditors, insurers, banks, payment networks, or authorities when reasonably necessary for compliance, fraud prevention, disputes, or legal claims.',
          'As part of a merger, financing, acquisition, reorganization, or sale of assets, subject to appropriate confidentiality and legal safeguards.',
          'With another party when you direct AccessRevamp to share information or give clear permission.',
        ],
        note: 'Providers are given only the access reasonably needed for their role and are expected to protect the information they handle.',
      },
      {
        id: 'tracking',
        title: '6. Cookies, local storage, and tracking',
        paragraphs: [
          'AccessRevamp uses essential browser storage and session technologies for navigation, account security, authentication, checkout return state, and customer-workspace functions. These technologies are necessary to provide the requested service.',
          'AccessRevamp does not sell personal information and does not currently use customer project data for cross-context behavioral advertising. If materially different analytics or advertising practices are introduced, this policy and any required consent controls will be updated first.',
        ],
      },
      {
        id: 'retention',
        title: '7. Retention',
        bullets: [
          'Account and project records are kept while the account or project is active and for a reasonable period afterward to provide downloads, support, revision history, and dispute records.',
          'Order, payment, tax, refund, and accounting records may be retained for the period required by law or legitimate recordkeeping needs.',
          'Authentication challenges and operational security logs are retained for shorter periods unless needed to investigate abuse, protect the service, or meet legal obligations.',
          'Deleted information may remain temporarily in encrypted backups until normal backup rotation completes.',
        ],
      },
      {
        id: 'security',
        title: '8. Security',
        paragraphs: [
          'AccessRevamp uses access controls, email confirmation, password-plus-email sign-in checks, private storage, expiring download links, encrypted transport, rate limits, and restricted operator access. No system can guarantee absolute security, so customers should use a unique password, protect verification messages, and report suspected account misuse promptly.',
        ],
      },
      {
        id: 'rights',
        title: '9. Your privacy rights',
        paragraphs: [
          'Depending on your location, you may have rights to request access, correction, deletion, restriction, portability, or objection; withdraw consent; appeal a decision; or complain to a regulator. Where applicable, California residents may also request details about collection and disclosure and may exercise rights without unlawful discrimination. AccessRevamp does not sell personal information or share it for cross-context behavioral advertising.',
          `Send requests to <a href="${mailto}">${SUPPORT_EMAIL}</a>. AccessRevamp may verify identity and may retain information when required by law, needed to complete a transaction, protect security, or establish legal claims.`,
        ],
      },
      {
        id: 'international',
        title: '10. International processing',
        paragraphs: [
          'Service providers may process information in countries other than the one where you live. Where required, AccessRevamp relies on contractual, organizational, or other lawful transfer safeguards.',
        ],
      },
      {
        id: 'children',
        title: '11. Children',
        paragraphs: [
          'AccessRevamp is intended for businesses and people able to enter a binding service agreement. It is not directed to children under 13, and AccessRevamp does not knowingly collect personal information from children under 13. A parent or guardian who believes a child supplied information should contact support.',
        ],
      },
      {
        id: 'changes',
        title: '12. Changes and contact',
        paragraphs: [
          `Material changes will be posted on this page with a new effective date. Privacy questions and requests may be sent to <a href="${mailto}">${SUPPORT_EMAIL}</a>. Do not email passwords, one-time codes, full card numbers, or private access tokens.`,
        ],
      },
    ],
  },
  policy: {
    kicker: 'Customer service policy',
    title: 'Clear scope, documented approvals, private delivery, and support that stays attached to the project.',
    intro: 'This policy describes how AccessRevamp handles customer communication, project scope, revisions, delivery, account access, and service concerns.',
    summary: [
      ['Written scope controls', 'The selected plan, checkout record, confirmed brief, and written project notes define the work.'],
      ['Approvals are recorded', 'Design selections, revision requests, progress updates, and final delivery are documented in the customer workspace.'],
      ['Two delivery channels', 'Approved videos and files can be delivered through the private dashboard and announced by email.'],
    ],
    sections: [
      {
        id: 'communication',
        title: '1. Customer communication',
        bullets: [
          `Account, project, billing, privacy, and delivery questions should be sent to <a href="${mailto}">${SUPPORT_EMAIL}</a>.`,
          'Customers should use the same confirmed email used for their order or project so records can be matched safely.',
          'AccessRevamp may require identity or order verification before discussing private project details or changing account access.',
          'Passwords, verification codes, full card numbers, private keys, and access tokens must never be sent by email.',
        ],
      },
      {
        id: 'scope',
        title: '2. Scope and change requests',
        paragraphs: [
          'The service scope is the plan purchased together with the accepted project brief, written clarifications, and documented approvals. Work outside that scope may require a separate quote, revised timeline, or new order.',
          'A request is not accepted merely because it was mentioned in a message. Material additions are accepted only after AccessRevamp confirms the scope, cost, and timing in writing.',
        ],
      },
      {
        id: 'inputs',
        title: '3. Customer responsibilities',
        bullets: [
          'Provide accurate contact, account, business, content, access, and project information.',
          'Supply content and files that you own, are licensed to use, or have permission to provide.',
          'Review requests and approvals within a reasonable time and identify any legal, regulatory, brand, or accessibility requirements that apply to the business.',
          'Maintain backups of source content and keep account credentials secure.',
        ],
      },
      {
        id: 'revisions',
        title: '4. Reviews, revisions, and approvals',
        paragraphs: [
          'Revision allowances are stated in the selected plan or written scope. A revision changes an existing approved direction; a new direction, additional page, new feature, or materially different sequence may be treated as added scope.',
          'An approval may be recorded through the customer workspace, approval link, or clear written confirmation. AccessRevamp may rely on the latest approval when continuing production.',
        ],
      },
      {
        id: 'timing',
        title: '5. Timing and delays',
        paragraphs: [
          'Delivery estimates are good-faith estimates, not guaranteed deadlines, unless a separate signed agreement expressly states otherwise. Timelines may move when content, access, approvals, third-party services, customer responses, or events outside reasonable control cause delay.',
        ],
      },
      {
        id: 'delivery',
        title: '6. Delivery and download access',
        bullets: [
          'Approved videos, designs, reports, website packages, and other deliverables may appear in the private dashboard with expiring download links.',
          'AccessRevamp may also send an email telling the customer that a file is ready. For security, the email may direct the customer to sign in rather than attach a private file.',
          'Customers should download and securely back up final deliverables. Continued hosting of downloadable files is not guaranteed forever unless a written agreement says otherwise.',
          'Final delivery is recorded when AccessRevamp publishes the final package or otherwise confirms delivery in writing.',
        ],
      },
      {
        id: 'quality',
        title: '7. Quality, accessibility, and third-party limits',
        paragraphs: [
          'AccessRevamp tests work against the agreed scope and aims for responsive, accessible, and secure implementation. Automated audits and observations are not certifications, legal opinions, penetration tests, or guarantees that every third-party platform, browser, assistive technology, integration, or future update will behave identically.',
          'Third-party services may change pricing, limits, APIs, policies, availability, or output. AccessRevamp is not responsible for a third party’s independent service, but will use reasonable care when integrating the agreed tools.',
        ],
      },
      {
        id: 'conduct',
        title: '8. Acceptable use and suspension',
        paragraphs: [
          'The service may not be used for unlawful content, infringement, fraud, malware, harassment, impersonation, unauthorized security testing, or abuse of another person’s privacy. AccessRevamp may pause work or restrict access when reasonably necessary to protect customers, the service, third parties, or legal compliance.',
        ],
      },
      {
        id: 'concerns',
        title: '9. Service concerns',
        paragraphs: [
          `Report a concern promptly to <a href="${mailto}">${SUPPORT_EMAIL}</a> with the project name, affected page or file, expected result, and screenshots when helpful. AccessRevamp will review the documented scope, delivery record, and applicable refund terms before proposing a resolution.`,
        ],
      },
    ],
  },
  terms: {
    kicker: 'Terms of service',
    title: 'The agreement for using AccessRevamp and purchasing one-time digital services.',
    intro: 'By using the website, creating an account, or purchasing a service, you agree to these terms and any project-specific written scope accepted with your order.',
    summary: [
      ['One-time services', 'Services are sold under the selected plan and written scope; no recurring platform subscription is created unless separately agreed.'],
      ['Customer-controlled content', 'You keep ownership of content you supply and grant the limited permission needed to perform the work.'],
      ['Mandatory rights preserved', 'Nothing in these terms removes consumer or statutory rights that cannot legally be waived.'],
    ],
    sections: [
      {
        id: 'agreement',
        title: '1. Agreement and eligibility',
        paragraphs: [
          'You must be able to enter a binding agreement and must provide accurate information. If you act for a company or another person, you represent that you have authority to bind them. Project-specific written terms control over these public terms if they directly conflict.',
        ],
      },
      {
        id: 'accounts',
        title: '2. Accounts and security',
        paragraphs: [
          'You are responsible for your password, verification messages, device access, and activity under your account. Notify AccessRevamp promptly if you suspect unauthorized access. AccessRevamp may require renewed verification, revoke sessions, or restrict access to protect the account.',
        ],
      },
      {
        id: 'orders',
        title: '3. Orders, prices, and payment',
        paragraphs: [
          'Prices and included work are shown at checkout or in a written quote. Taxes, third-party fees, licensed assets, advertising spend, domain purchases, premium software, and services outside the stated scope are not included unless expressly listed. Payment is processed by an independent payment processor under its terms.',
          'An order is accepted when payment is verified and AccessRevamp confirms the applicable entitlement or project record. AccessRevamp may cancel and refund an order affected by a pricing error, fraud concern, legal restriction, or inability to provide the service.',
        ],
      },
      {
        id: 'intellectual-property',
        title: '4. Content, intellectual property, and license',
        paragraphs: [
          'You retain ownership of content and materials you provide. You grant AccessRevamp a non-exclusive license to host, copy, modify, display internally, and otherwise use those materials only as reasonably necessary to provide, secure, support, and document the service.',
          'After full payment, you receive the rights in final custom deliverables described in the written scope, excluding pre-existing tools, reusable methods, open-source components, third-party materials, fonts, stock assets, software, and services governed by separate licenses. Drafts, unused concepts, internal tools, and working files are not included unless the scope says otherwise.',
          'Purchase does not automatically grant portfolio rights. Portfolio publication requires a separate optional permission. AccessRevamp will not publish a customer project in a portfolio without that permission. Permission may be limited or withdrawn for future use, but cannot require removal from copies already lawfully distributed or archived where removal is not reasonably possible.',
        ],
      },
      {
        id: 'warranties',
        title: '5. Service standard and disclaimers',
        paragraphs: [
          'AccessRevamp will perform the agreed service with reasonable care and skill. Except for express written commitments and rights that cannot be excluded, the website, previews, recommendations, and deliverables are provided without additional warranties, including implied warranties of merchantability, fitness for a particular purpose, uninterrupted availability, or guaranteed business results.',
          'Marketing, conversion, search ranking, accessibility, security, legal compliance, revenue, or platform approval outcomes are not guaranteed. You remain responsible for business decisions, published claims, legal notices, regulated content, and final acceptance testing for your use case.',
        ],
      },
      {
        id: 'liability',
        title: '6. Limitation of liability',
        paragraphs: [
          'To the fullest extent permitted by law, AccessRevamp is not liable for indirect, incidental, special, consequential, exemplary, or punitive damages; lost profits, revenue, data, goodwill, or business opportunity; or losses caused by third-party services, customer content, unauthorized account access, or use outside the agreed scope.',
          'To the fullest extent permitted by law, AccessRevamp’s aggregate liability arising from an affected service is limited to the amount paid to AccessRevamp for that service during the twelve months before the event giving rise to the claim. These limits do not apply where liability cannot legally be limited or excluded.',
        ],
      },
      {
        id: 'indemnity',
        title: '7. Responsibility for supplied materials and misuse',
        paragraphs: [
          'To the extent permitted by law, you are responsible for claims arising from content, instructions, data, access, or materials you supply; your unlawful or unauthorized use of the service; or your breach of another party’s rights, except to the extent caused by AccessRevamp’s own breach or misconduct.',
        ],
      },
      {
        id: 'termination',
        title: '8. Suspension and termination',
        paragraphs: [
          'AccessRevamp may suspend or terminate access for material breach, fraud, nonpayment, unlawful activity, security risk, abuse, or conduct that threatens the service or others. Where practical, AccessRevamp will provide notice and an opportunity to cure. Terms that by their nature should continue—including payment, ownership, disclaimers, liability limits, and dispute provisions—survive termination.',
        ],
      },
      {
        id: 'law',
        title: '9. Disputes, governing rules, and general terms',
        paragraphs: [
          `Contact <a href="${mailto}">${SUPPORT_EMAIL}</a> first so the parties can try to resolve a dispute informally. These terms are governed by the laws applicable to AccessRevamp’s principal place of business, without overriding mandatory consumer protections that apply to you. A project-specific agreement may identify a more specific governing law or forum.`,
          'If one provision is unenforceable, the remaining provisions continue. Failure to enforce a provision is not a waiver. You may not transfer an order or account without consent; AccessRevamp may transfer the agreement as part of a business reorganization or sale. Electronic notices and approvals may satisfy writing requirements where permitted.',
        ],
      },
      {
        id: 'updates',
        title: '10. Changes',
        paragraphs: [
          'Updated terms apply prospectively from the posted effective date unless law requires otherwise. Material changes affecting an active paid project will not reduce the confirmed scope without agreement.',
        ],
      },
    ],
  },
  accessibility: {
    kicker: 'Accessibility statement',
    title: 'AccessRevamp is designed to be usable with keyboards, reduced motion, readable contrast, and assistive technology.',
    intro: 'Accessibility is treated as an ongoing product and content responsibility rather than a one-time badge.',
    summary: [
      ['Keyboard first', 'Primary navigation, forms, dialogs, and customer workspace controls are intended to be operable without a mouse.'],
      ['Motion choices', 'Reduced-motion preferences are respected for animated and scroll-driven experiences.'],
      ['Report barriers', `Accessibility feedback is reviewed through ${SUPPORT_EMAIL}.`],
    ],
    sections: [
      { id: 'commitment', title: '1. Commitment', paragraphs: ['AccessRevamp aims to provide a perceivable, operable, understandable, and robust public website and customer workspace. The service uses semantic structure, labels, visible focus, status announcements, contrast checks, responsive layouts, and reduced-motion handling.'] },
      { id: 'testing', title: '2. Testing and limitations', paragraphs: ['Automated checks are combined with manual review. No automated score or single test can prove complete conformance across every browser, device, assistive technology, customer-supplied asset, or third-party component. Confirmed limitations are prioritized according to impact and the available remedy.'] },
      { id: 'feedback', title: '3. Accessibility support', paragraphs: [`Email <a href="${mailto}">${SUPPORT_EMAIL}</a> with the page or task, what you expected, what happened, and your browser or assistive technology if you are comfortable sharing it. Do not include passwords or verification codes.`] },
      { id: 'response', title: '4. Response', paragraphs: ['AccessRevamp will acknowledge actionable accessibility reports, investigate reproducible barriers, and provide a resolution, workaround, or documented limitation when reasonably possible.'] },
    ],
  },
  outreach: {
    kicker: 'Outreach standards',
    title: 'Relevant, identifiable, evidence-backed, human-approved, and easy to stop.',
    intro: 'These standards apply to business outreach initiated by AccessRevamp and are designed to prevent misleading or unwanted messaging.',
    summary: [
      ['Public business sources only', 'Only intentionally published business contact details may be considered.'],
      ['Human approval required', 'Automated evidence may assist research, but a person must approve the message and recipient.'],
      ['Suppression is durable', 'Opt-outs are retained so future outreach remains blocked.'],
    ],
    sections: [
      { id: 'source', title: '1. Sources and relevance', bullets: ['Use only intentionally published business contact details and record the public source.', 'Base each message on a human-verified observation from the reviewed public page.', 'Do not infer sensitive traits or use purchased personal-contact lists.'] },
      { id: 'message', title: '2. Message requirements', bullets: ['Identify AccessRevamp accurately and use a working reply address.', 'Keep claims accurate, specific, and proportionate to the evidence.', 'Do not use fake reply subjects, false urgency, invented relationships, unverified security claims, or legal threats. Automated spam-classification manipulation is prohibited.', 'Include a clear way to opt out and honor it.'] },
      { id: 'suppression', title: '3. Opt-outs and complaints', paragraphs: [`Opt-out and outreach complaints may be sent to <a href="${mailto}">${SUPPORT_EMAIL}</a>. Suppressed recipients remain excluded from future outreach unless they later make a clear new request.`] },
    ],
  },
  support: {
    kicker: 'Customer support',
    title: 'Real help for accounts, orders, project progress, files, privacy, and accessibility.',
    intro: 'Use one support address so the request can be matched to the correct customer and project record without exposing private details in public channels.',
    summary: [
      ['Support email', `<a href="${mailto}">${SUPPORT_EMAIL}</a>`],
      ['Response target', 'AccessRevamp aims to acknowledge support requests within two business days. Complex reviews may take longer.'],
      ['Private delivery', 'Approved videos and files appear in the customer dashboard; email can be used to announce that they are ready.'],
    ],
    sections: [
      {
        id: 'contact',
        title: '1. Contact support',
        paragraphs: [
          `Email <a href="${mailto}">${SUPPORT_EMAIL}</a>. Support is currently provided by email; there is no public phone-support line or emergency response service.`,
          'For the fastest match, write from the confirmed email used for the AccessRevamp account, order, or project.',
        ],
      },
      {
        id: 'include',
        title: '2. What to include',
        bullets: [
          '<strong>Account access:</strong> the account email and a description of the step that failed. Never send the password or verification code.',
          '<strong>Order or billing:</strong> the plan, purchase date, order reference if available, and the issue. Never send a full card number or security code.',
          '<strong>Project or delivery:</strong> the project name, affected page or file, expected result, actual result, and a screenshot or short screen recording when useful.',
          '<strong>Privacy request:</strong> the right you want to exercise and the account email. Additional identity verification may be required.',
          '<strong>Accessibility report:</strong> the page, task, barrier, browser, device, and assistive technology if you are comfortable sharing them.',
        ],
      },
      {
        id: 'account',
        title: '3. Signup and sign-in help',
        bullets: [
          'Use the newest verification email; older codes or secure buttons may expire after a new request.',
          'Check Inbox, Spam, Promotions, and filtered folders. Add the sender to trusted contacts when appropriate.',
          'A sign-in requires the correct password first and then the fresh email verification for that attempt.',
          'AccessRevamp support will never ask you to forward a verification message or disclose a password, one-time code, recovery token, or private link.',
        ],
      },
      {
        id: 'dashboard',
        title: '4. Project dashboard and delivery',
        paragraphs: [
          'After a verified sign-in, the dashboard can show project status, progress updates, brief and references, designs for review, approved videos, reports, website packages, and download links. Links may expire and can be refreshed by reloading the workspace.',
          'When a video or file is published, it becomes available in the private dashboard. AccessRevamp may also send a customer email directing the customer to sign in and view or download it.',
        ],
      },
      {
        id: 'security',
        title: '5. Security and abuse reports',
        paragraphs: [
          `Send suspected account compromise, exposed private links, impersonation, or security concerns to <a href="${mailto}">${SUPPORT_EMAIL}</a> with “Security” in the subject. Do not perform active testing against systems you do not own or lack written authorization to test.`,
        ],
      },
      {
        id: 'expectations',
        title: '6. Response expectations',
        paragraphs: [
          'AccessRevamp aims to acknowledge messages within two business days. Resolution time depends on identity verification, project complexity, provider availability, and whether the request involves billing, privacy, accessibility, or a security investigation. Response targets are goals, not guaranteed service-level commitments.',
        ],
      },
    ],
  },
  legal: {
    kicker: 'Policy center',
    title: 'The rules, rights, service boundaries, and support details in one place.',
    intro: 'These pages explain how AccessRevamp handles information, customer work, orders, refunds, accessibility, outreach, and support.',
    summary: [
      ['Privacy policy', 'What is collected, why it is used, sharing, retention, security, and privacy rights.'],
      ['Customer policy', 'How scope, revisions, approvals, delivery, account access, and support are handled.'],
      ['Customer support', `How to reach AccessRevamp at ${SUPPORT_EMAIL} and what to include.`],
    ],
    sections: [
      { id: 'privacy', title: 'Privacy policy', paragraphs: ['Review the information AccessRevamp collects, how it is used, service-provider categories, retention, security controls, and available privacy rights.'], link: ['/privacy', 'Read the Privacy Policy'] },
      { id: 'policy', title: 'Customer service policy', paragraphs: ['Review project scope, communication, revisions, approvals, timing, private delivery, support, and acceptable-use rules.'], link: ['/policy', 'Read the Customer Policy'] },
      { id: 'terms', title: 'Terms of service', paragraphs: ['Review the contract rules for accounts, orders, content rights, service standards, disclaimers, liability, and disputes.'], link: ['/terms', 'Read the Terms'] },
      { id: 'refunds', title: 'Refund policy', paragraphs: ['Review cancellation and refund handling before final digital delivery and the rights that remain under applicable law.'], link: ['/refunds', 'Read the Refund Policy'] },
      { id: 'accessibility', title: 'Accessibility statement', paragraphs: ['Review the accessibility commitment, testing approach, limitations, and barrier-reporting channel.'], link: ['/accessibility', 'Read the Accessibility Statement'] },
      { id: 'support', title: 'Customer support', paragraphs: [`Get help with accounts, orders, projects, delivery files, privacy, accessibility, or security through <a href="${mailto}">${SUPPORT_EMAIL}</a>.`], link: ['/support', 'Open Customer Support'] },
    ],
  },
};

function refundPage() {
  return {
    kicker: 'Refund policy',
    title: refundPolicy.title,
    intro: refundPolicy.summary,
    summary: [
      ['Before final delivery', 'Eligible cancellation and refund requests are reviewed against the order, work completed, incurred costs, and written scope.'],
      ['After final delivery', 'Digital delivery and completed custom work may limit cancellation rights to the extent permitted by law.'],
      ['Mandatory rights', 'Nothing in this policy removes non-waivable consumer protections.'],
    ],
    sections: [
      { id: 'before-delivery', title: '1. Before final delivery', paragraphs: [refundPolicy.delivery] },
      { id: 'cinematic-timing', title: '2. Cinematic timing and reserved production', paragraphs: [refundPolicy.timing] },
      { id: 'rights', title: '3. Rights preserved', paragraphs: [refundPolicy.rights] },
      { id: 'request', title: '4. Requesting cancellation or a refund', paragraphs: [`Email <a href="${mailto}">${SUPPORT_EMAIL}</a> from the account or order email. Include the plan, purchase date, order reference if available, and the reason for the request. Do not include full card details.`] },
      { id: 'review', title: '5. Review and outcome', paragraphs: ['AccessRevamp will review the verified payment record, project status, delivered files, approved scope, completed work, non-recoverable third-party costs, and applicable law before confirming the outcome. Refunds, when approved, are returned through the original payment method where reasonably possible. Processing time may depend on the payment provider and bank.'] },
    ],
  };
}

function pageNavigation(activeKind) {
  return `<nav class="policy-index" aria-label="Policy pages"><span>Policy index</span>${policyLinks.map(([kind, label]) => `<a href="${routeFor[kind]}" data-nav${kind === activeKind ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

function sectionMarkup(section) {
  return `<section class="policy-section" id="${section.id}"><div class="policy-section__number" aria-hidden="true">${String(section.id).slice(0, 2).toUpperCase()}</div><div class="policy-section__copy"><h2>${section.title}</h2>${(section.paragraphs || []).map((paragraph) => `<p>${paragraph}</p>`).join('')}${section.bullets?.length ? `<ul>${section.bullets.map((item) => `<li>${item}</li>`).join('')}</ul>` : ''}${section.note ? `<aside class="policy-note">${section.note}</aside>` : ''}${section.link ? `<a class="text-link policy-section__link" href="${section.link[0]}" data-nav>${section.link[1]} →</a>` : ''}</div></section>`;
}

export function legalPage(kind = 'legal', pathname = routeFor[kind] || '/legal') {
  const page = kind === 'refunds' ? refundPage() : (pages[kind] || pages.legal);
  const supportSubject = encodeURIComponent(`AccessRevamp support — ${page.kicker}`);
  const supportLink = `${mailto}?subject=${supportSubject}`;

  return shell(`<div class="policy-page" data-policy-kind="${kind}">
    <section class="policy-hero">
      <div class="container-wide policy-hero__grid">
        <div class="policy-hero__copy">
          <span class="eyebrow">${page.kicker} · Effective ${LEGAL_LAST_UPDATED}</span>
          <h1>${page.title}</h1>
          <p class="lede">${page.intro}</p>
          <div class="policy-hero__actions"><a class="button" href="${supportLink}">Email customer support →</a><a class="button button--ghost" href="/legal" data-nav>View policy center</a></div>
        </div>
        ${pageNavigation(kind)}
      </div>
    </section>

    <section class="policy-summary" aria-label="Policy summary">
      <div class="container-wide policy-summary__grid">${page.summary.map(([title, body], index) => `<article><span>0${index + 1}</span><h2>${title}</h2><p>${body}</p></article>`).join('')}</div>
    </section>

    <section class="section policy-body">
      <div class="container-wide policy-layout">
        <aside class="policy-toc"><span>On this page</span>${page.sections.map((section) => `<a href="#${section.id}">${section.title.replace(/^\d+\.\s*/, '')}</a>`).join('')}</aside>
        <article class="policy-document">${page.sections.map(sectionMarkup).join('')}</article>
      </div>
    </section>

    <section class="section policy-contact">
      <div class="container-wide policy-contact__card"><div><span class="eyebrow">Need a human response?</span><h2>Contact AccessRevamp customer support.</h2><p>Use the confirmed account or order email when possible. Never send passwords, one-time codes, full card numbers, private keys, or access tokens.</p></div><div><a class="button" href="${supportLink}">${SUPPORT_EMAIL} →</a><small>Support is currently provided by email.</small></div></div>
    </section>
  </div>`, { pathname, pageClass: 'policy-shell' });
}
