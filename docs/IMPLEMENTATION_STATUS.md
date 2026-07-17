# AccessRevamp implementation status

Last updated: July 17, 2026

## Implemented in this repository

- Responsive, keyboard-accessible marketing site with home, pricing, sample report, methodology, outreach standards, contact, authentication, customer dashboard, privacy, terms, accessibility, success, and cancellation routes.
- Exactly two one-time catalog entries:
  - Homepage Reveal: **$50 USD** (`5000` cents)
  - Quick Fix Plan: **$199 USD** (`19900` cents)
- No recurring AccessRevamp plan, monthly charge, or hidden implementation tier.
- Stripe Checkout Session function, signature-verified webhook, event idempotency, exact amount validation, and pay-first/account-second order claiming.
- Supabase migrations with Row Level Security for customer data and server-only access for operational data.
- Rate-limited contact intake that does not store a raw IP address.
- Outreach prospect, finding, review, queue, audit, and permanent suppression records.
- Database guardrails requiring public contact provenance, human-verified evidence, human approval, sender identity, opt-out copy, suppression checks, 30-day recipient spacing, and a hard maximum of 20 queued/scheduled/sent items per UTC day.
- Outreach sending disabled by default. No unattended commercial email sender is included.
- Optional CSV and Google Sheets review bridge that cannot send mail.
- Netlify configuration for a free `*.netlify.app` deployment, serverless functions, SPA routing, caching, and security headers.
- GitHub Actions quality gate covering static policy checks, tests, production build, and production dependency audit.

## Connected Stripe sandbox catalog

The AccessRevamp Stripe sandbox currently contains:

| Plan | Product | Price | Payment link |
|---|---|---|---|
| Homepage Reveal | `accessrevamp_homepage_reveal` | `price_1TuGoNLzyGRcyGQJRjtGsiMV` | `https://book.stripe.com/test_dRmdRabhid0QfBfedagQE00` |
| Quick Fix Plan | `accessrevamp_quick_fix` | `price_1TuGoTLzyGRcyGQJfdkqoE3f` | `https://book.stripe.com/test_cNi00k99a1i81Kp6KIgQE01` |

Both links carry an explicit `plan_key` and `source` into Stripe records. They are test-mode links and do not create a live charge.

## Deliberately not marked production-ready yet

The following steps require the correct external account or real business information and must not be guessed:

1. **Supabase:** apply the migrations to the dedicated AccessRevamp project—not an unrelated existing database—and add that project's URL, publishable key, and server-only service-role key to Netlify.
2. **Deployment:** import this repository into Netlify and select the final free site name.
3. **Stripe webhook:** add the deployed `/.netlify/functions/stripe-webhook` endpoint, store its signing secret, complete sandbox end-to-end testing, then separately create or confirm live-mode catalog records when the business is ready to accept money.
4. **Business identity:** add the real contact email, legal operator identity, postal address, privacy/terms review, and refund/cancellation process.
5. **Outreach sender:** configure a real reply-capable mailbox, sender authentication, bounce and complaint handling, and the final human approval workflow before setting `sending_enabled` to true.

## Launch rule

A green code build does not by itself mean the business is live. Production launch requires the dedicated Supabase migration, deployed environment variables, a verified Stripe webhook, live-mode payment testing, and accurate public business/contact details.
