# AccessRevamp implementation status

Last updated: July 17, 2026

## Implemented in the repository

- Responsive marketing site with home, pricing, sample report, methodology, outreach standards, contact, authentication, customer dashboard, privacy, terms, accessibility, success, and cancellation routes.
- Exactly two paid catalog entries:
  - Homepage Reveal: **$50 USD one time** (`5000` cents)
  - Quick Fix Plan: **$199 USD one time** (`19900` cents)
- No recurring AccessRevamp plan, monthly charge, or hidden implementation tier.
- Stripe Checkout Session function, signed-webhook verification, retry-safe event processing, exact base-price/currency/tax validation, delayed-payment handling, and pay-first/account-second order claiming.
- Isolated Supabase `ar_*` tables, service-only RPCs, security-invoker customer views, and Row Level Security without altering the connected project's unrelated tables.
- Confirmed-email ownership linking for paid orders and projects.
- Rate-limited contact intake that stores an HMAC request fingerprint instead of a raw IP address.
- Passive public-homepage scanner with private/reserved destination blocking and no form submission, checkout, credential, or exploitation behavior.
- Public-contact provenance, attributed human-verified findings, active-staff concept approval, HMAC-protected expiring previews, draft outreach, review notes, and permanent suppression.
- Database guardrails requiring a human-verified U.S. prospect, the listed public business email, an active staff approver, a live noindex preview, a verified finding, an HTTPS opt-out URL, opt-out copy, suppression checks, one initial message, at most one follow-up, and a maximum of 20 approval transitions per UTC day.
- Signed one-click opt-out that permanently suppresses the address and marks the prospect suppressed.
- Content guardrails that reject fake reply/forward subjects, URL shorteners, invented partnerships or requests, scare/legal/security claims, unsupported revenue claims, and messages that omit the reviewed business domain.
- No unattended commercial sender. Import, approval, and export scripts all state that they send nothing.
- Optional CSV and Google Sheets review handoff that has no Gmail permission or sending function.
- Netlify configuration for a free `*.netlify.app` deployment, serverless functions, SPA routing, caching, and security headers.
- GitHub Actions quality gate covering static policy checks, tests, production build, and production dependency audit.

## Live Supabase state

The connected Supabase project has the isolated AccessRevamp schema installed and healthy. AccessRevamp owns only `ar_*` tables plus the `accessrevamp_private` schema. RLS, service-role-only functions, customer views, indexes, review triggers, preview triggers, outreach guardrails, and Auth record claiming have been applied.

A confirmed Supabase Auth account matching the connected repository owner is installed as the active AccessRevamp owner, and its isolated `ar_profiles` record is present. Findings, concepts, and outreach approvals can therefore be attributed to a real active staff UUID without exposing or modifying unrelated application data.

The latest Supabase advisor pass identified no AccessRevamp-specific missing RLS or foreign-key-index issue. A pre-existing unrelated project function and the project-level leaked-password setting remain outside the AccessRevamp schema; leaked-password protection should be enabled before public Auth launch.

## Connected Stripe sandbox catalog

| Plan | Price ID | Amount | Mode |
|---|---|---:|---|
| Homepage Reveal | `price_1TuGoNLzyGRcyGQJRjtGsiMV` | $50 USD | Test, one time |
| Quick Fix Plan | `price_1TuGoTLzyGRcyGQJfdkqoE3f` | $199 USD | Test, one time |

The repository also contains test-mode payment-link fallbacks. These do not create live charges. Test and live identifiers must never be mixed.

## External steps still required

1. **Deployment:** import the repository into Netlify, choose the free site name, and add every value from `.env.netlify.example`.
2. **Public identity:** provide the real contact email, legal/operator identity, valid postal address, reviewed privacy/terms/refund text, and tax handling.
3. **Stripe:** configure the deployed webhook, complete the sandbox test matrix, activate the account, and create or confirm matching live-mode catalog values and a restricted server key before accepting money.
4. **Auth settings:** configure the final site/redirect URLs and enable leaked-password protection.
5. **Outreach mailbox:** configure a reply-capable business mailbox, SPF/DKIM/DMARC, bounce and complaint handling, reply reconciliation, and a final pre-send suppression check before connecting any sender adapter.

## Launch rule

A green code build does not mean the business is publicly live. Launch requires a deployed URL, real public business identity, configured environment secrets, a verified Stripe webhook, tested live-mode payments, final policies, and a reviewed sender workflow. The repository intentionally does not guess or commit those values.
