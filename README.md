# AccessRevamp

A production-oriented storefront review and one-time website revamp platform built from the AccessRevamp blueprint.

## Commercial catalog

| Service | Price | Billing | Scope |
|---|---:|---|---|
| Homepage Reveal | **$50** | One time | Human-reviewed homepage findings, evidence, accessibility/usability and passive technical observations, prioritized guidance, and the complete first-screen concept reveal. |
| Quick Fix Plan | **$199** | One time | The agreed full website revamp, the reviewed findings, responsive/accessibility/usability checks, retest notes, and practical customer-reach, advertising, and monetization recommendations. |

There are no monthly plans, hidden implementation tiers, or recurring AccessRevamp platform charges. Scope must still be confirmed in writing, and legally required taxes cannot be misrepresented.

## What is included

- Polished responsive landing experience and client-side routing
- Pricing, sample report, methodology, outreach standards, contact, auth, dashboard, privacy, terms, accessibility, and checkout-result views
- Supabase Auth client and row-level-security-aware dashboard
- Rate-limited contact function
- Stripe one-time Checkout Session function and signature-verified webhook
- Idempotent order recording
- Supabase migration for customers, orders, projects, reviewed findings, prospects, outreach queue, permanent suppression, and audit records
- Database-enforced maximum of 20 queued/scheduled/sent outreach items per UTC day
- Human approval, public contact provenance, verified-finding, sender identity, opt-out, 30-day spacing, and suppression gates
- Optional Google Sheets review bridge that **does not send mail**
- Netlify free-tier deployment configuration and GitHub Actions CI

## Current Stripe state

The repository points to the AccessRevamp Stripe **sandbox** catalog created for this project:

- Homepage Reveal price: \`price_1TuGoNLzyGRcyGQJRjtGsiMV\`
- Quick Fix price: \`price_1TuGoTLzyGRcyGQJfdkqoE3f\`

The default payment URLs are test links. Replace them with live-mode links only after the Stripe account is activated, business details are complete, and live checkout is tested. Never put a Stripe secret key in a \`VITE_\` variable.

## Local development

\`\`\`bash
cp .env.example .env
npm install
npm run dev
\`\`\`

Run the full quality gate:

\`\`\`bash
npm run check
npm audit --audit-level=high
\`\`\`

## Supabase setup

1. Confirm you are in the dedicated AccessRevamp Supabase project. Do not apply this migration to a different application's database.
2. Apply \`supabase/migrations/202607170001_accessrevamp.sql\` with the Supabase CLI or dashboard.
3. Copy the project URL and publishable key into the two public \`VITE_SUPABASE_*\` variables.
4. Add the service-role key only as the server-only \`SUPABASE_SERVICE_ROLE_KEY\` variable in Netlify.
5. Configure Auth site and redirect URLs for the final Netlify URL.
6. Run Supabase security and performance advisors after the migration.

## Netlify deployment (free URL)

1. Import this GitHub repository into Netlify.
2. Netlify reads \`netlify.toml\`; no build settings need to be guessed.
3. Add all required variables from \`.env.example\` in the Netlify environment UI.
4. Generate a random \`CONTACT_RATE_LIMIT_SECRET\` of at least 24 characters.
5. Deploy and confirm \`/.netlify/functions/health\` reports the expected services as configured.
6. Add the deployed Stripe webhook URL: \`https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook\`.
7. Subscribe the endpoint to \`checkout.session.completed\` at minimum.

The initial free address will be a \`*.netlify.app\` URL. Buy a custom domain only after the business is ready.

## Outreach is intentionally approval-gated

No commercial email provider is wired to an unattended send loop. Before enabling any sender, configure:

- a real sender name and reply-capable mailbox;
- a valid business postal address;
- the final AccessRevamp site URL;
- DNS authentication appropriate to the sending provider;
- a reviewed message with source URL and verified findings;
- the permanent suppression and one-click opt-out path;
- the relevant legal requirements for every recipient jurisdiction.

See [docs/OUTREACH_STANDARD.md](docs/OUTREACH_STANDARD.md).

## Security boundaries

The initial review is passive. It must not submit forms, open checkout, create accounts, use credentials, probe admin/login/cart paths, connect to private IPs, perform exploitation, or describe unverified signals as proven vulnerabilities. See [docs/SECURITY.md](docs/SECURITY.md).

## Required launch items not stored in Git

- Final contact email
- Business legal identity and postal address
- Correct dedicated Supabase project values
- Netlify site connection and environment values
- Stripe live-mode products/links/webhook secret after activation
- Reviewed privacy/terms language for the operating jurisdiction

Secrets belong in the deployment provider, never in this repository.
