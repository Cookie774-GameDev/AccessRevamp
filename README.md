# AccessRevamp

**See the barrier. Preview the fix.**

AccessRevamp is a service-first accessibility remediation studio for independent storefronts and service businesses. The public site explains the offer, shows a sample report, supports contact and customer accounts, and sells two clearly scoped one-time services. The repository also contains the passive review, private-preview, payment, customer-delivery, and approval-gated outreach foundation.

## Commercial catalog

| Service | Price | Billing | Scope |
|---|---:|---|---|
| AccessRevamp Snapshot | Free | No checkout | One human-verified accessibility finding, one usability/design opportunity, evidence, and a private first-screen concept for a qualified prospect. |
| Homepage Reveal | **$50** | One time | Human-reviewed homepage findings, evidence, severity and confidence labels, WCAG references, a prioritized repair plan, and the complete first-screen concept reveal. |
| Quick Fix Plan | **$199** | One time | The agreed website revamp, reviewed findings, accessibility/usability/responsive checks, retest notes, and practical customer-reach, advertising, and monetization recommendations. |

There are no subscriptions, recurring AccessRevamp platform charges, hidden implementation tiers, or separate processing surcharges. Scope is confirmed in writing before implementation. Legally required taxes must still be disclosed and collected correctly.

## Implemented foundation

- Polished responsive marketing site with pricing, methodology, sample report, contact, authentication, customer dashboard, legal pages, and checkout-result routes.
- Supabase Auth client with own-row customer access through Row Level Security and security-invoker dashboard views.
- Isolated `ar_*` database objects that do not reuse or overwrite another application's generic `profiles`, `orders`, or project tables.
- Rate-limited contact function that stores an HMAC request fingerprint rather than a raw IP address.
- Server-created Stripe-hosted Checkout with exact $50 and $199 catalog validation.
- Signature-verified, retry-safe Stripe webhook with synchronous and delayed-payment handling, event failure recording, and confirmed-email ownership linking.
- Passive public-homepage scanner using Playwright and axe-core. Its findings remain candidates until a person verifies them.
- Randomized HMAC-protected, watermarked, noindex private concepts with active-staff approval and 1–30 day expiry.
- Public-contact provenance, verified-finding attribution, active-staff approval, permanent suppression, one-click opt-out, and a database-enforced maximum of 20 approval transitions per UTC day.
- One initial message and at most one follow-up per prospect.
- Optional CSV and Google Sheets review handoff that does not request Gmail permissions or send mail.
- Netlify configuration for a free `*.netlify.app` deployment and GitHub Actions CI.

## Local development

Use Node.js 22.12 or newer.

```bash
cp .env.example .env
npm ci
npm run dev
```

Run the full quality gate:

```bash
npm run check
npm audit --omit=dev --audit-level=high
```

## Supabase state and setup

The connected Supabase project already has the isolated AccessRevamp schema installed. The `ar_*` prefix and `accessrevamp_private` schema allow it to coexist with unrelated application tables; the migration deliberately does not modify those tables.

For another environment:

1. Apply every SQL file in `supabase/migrations/` in filename order.
2. Copy the project URL and publishable key into `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Add the service-role key only as the server-side `SUPABASE_SERVICE_ROLE_KEY` deployment secret.
4. Configure Supabase Auth site and redirect URLs for the final deployed site.
5. Sign up and confirm the first owner account, then add that Auth UUID to `public.ar_staff` using the statement in `docs/PRIVATE_PREVIEWS.md`.
6. Run the Supabase security and performance advisors after applying the complete migration set.

Never expose the service-role key in browser code, a `VITE_` variable, Git, a Sheet, or an outreach record.

## Private concepts

A private concept can be created as part of `scripts/import-reviewed-prospects.mjs` or with `scripts/create-private-preview.mjs`. Both paths require:

- a U.S. prospect with a public business-contact source;
- a verified finding attributed to an active `ar_staff` user;
- an active staff concept approver;
- `PREVIEW_TOKEN_SECRET` containing at least 32 random characters;
- an HTTPS deployed site URL.

The generated URL uses `/.netlify/functions/preview?token=...`. Supabase stores only an HMAC-SHA-256 digest of the raw token. The rendered page is watermarked, disconnected from the prospect's inventory/accounts/checkout, sends noindex directives, and stops working after expiry or revocation.

See `docs/PRIVATE_PREVIEWS.md` and `docs/REVIEW_PIPELINE.md`.

## Stripe sandbox state

The connected AccessRevamp Stripe account currently contains this test-mode catalog:

- Homepage Reveal: `price_1TuGoNLzyGRcyGQJRjtGsiMV` — **$50 USD one time**
- Quick Fix Plan: `price_1TuGoTLzyGRcyGQJfdkqoE3f` — **$199 USD one time**

The default payment URLs are test links. Do not mix test-mode and live-mode identifiers. Create or confirm the matching live products, prices, payment links, restricted server key, and webhook only after the Stripe account is activated and the business identity is complete.

## Netlify deployment and free URL

1. Import this repository into Netlify.
2. Netlify reads `netlify.toml`; the build output is `dist` and server functions are in `netlify/functions`.
3. Copy every required variable from `.env.netlify.example` into Netlify's environment settings.
4. Generate independent random values of at least 32 characters for `CONTACT_RATE_LIMIT_SECRET`, `PREVIEW_TOKEN_SECRET`, and `UNSUBSCRIBE_SECRET`.
5. Deploy and verify `/.netlify/functions/health`.
6. Add `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook` as the Stripe webhook endpoint.
7. Subscribe it to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`.
8. Test both one-time purchases, account confirmation, order linking, cancellation, delayed payment, duplicate webhook delivery, and an invalid-price event.

The initial public address can remain a free `*.netlify.app` URL until the business is ready for a custom domain.

## Outreach remains approval-gated

The repository intentionally contains no unattended commercial email sender. It can import reviewed prospects, create private concepts, produce drafts, apply an active-staff approval, generate a signed one-click opt-out URL, and export at most 20 approved rows. It does not send email.

Before connecting any sender, provide:

- a real sender name and reply-capable mailbox;
- a valid business postal address;
- the final AccessRevamp site URL;
- SPF, DKIM, and DMARC appropriate to the chosen mailbox/provider;
- bounce, complaint, reply, and suppression reconciliation;
- final legal review for every recipient jurisdiction;
- a last suppression check immediately before each send.

Messages must identify the reviewed public page, use restrained evidence-backed language, include the AccessRevamp website, disclose the commercial nature, and provide a clear opt-out. Do not use fake `Re:`/`Fwd:` subjects, URL shorteners, invented partnerships or requests, legal threats, unsupported security claims, or unsupported revenue estimates.

See `docs/OUTREACH_STANDARD.md` and `docs/REVIEW_PIPELINE.md`.

## Security boundaries

The initial review is passive. It must not submit forms, enter checkout, create accounts, use credentials, probe private routes, connect to private/reserved IP addresses, perform exploitation, or describe automated signals as proven violations. See `docs/SECURITY.md`.

## External launch items not stored in Git

- Final public contact email.
- Real legal/operator identity and valid postal address.
- Netlify site connection, generated public URL, and environment variables.
- A confirmed Supabase Auth owner added to `ar_staff`.
- Stripe live-mode catalog, restricted key, and deployed webhook after activation.
- A reply-capable authenticated mailbox and reviewed sender integration.
- Final privacy, terms, refund, tax, and outreach review for the operating jurisdiction.
- Supabase leaked-password protection enabled in the Auth settings.

A green build does not by itself mean the business is publicly launched. Secrets and real business identity values belong in the deployment providers, never in this repository.
