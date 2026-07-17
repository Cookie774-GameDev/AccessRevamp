# AccessRevamp

**See the barrier. Preview the fix.**

AccessRevamp is an AI-assisted accessibility remediation studio for independent storefronts and service businesses. The public site explains the offer, shows a sample report, supports contact and customer accounts, and sells two clearly scoped one-time services. The repository also contains the internal evidence, private-preview, payment, and approval-gated outreach foundation.

## Commercial catalog

| Service | Price | Billing | Scope |
|---|---:|---|---|
| AccessRevamp Snapshot | Free | No checkout | One human-verified accessibility finding, one usability/design opportunity, evidence, and a private first-screen concept used for qualified outreach. |
| Homepage Reveal | **$50** | One time | Human-reviewed homepage findings, evidence, severity and confidence labels, WCAG references, a prioritized repair plan, and the complete first-screen concept reveal. |
| Quick Fix Plan | **$199** | One time | The agreed full website revamp, reviewed findings, accessibility/usability/responsive checks, retest notes, and practical customer-reach, advertising, and monetization recommendations. |

There are no subscriptions, recurring AccessRevamp platform charges, hidden implementation tiers, or separate processing surcharges. Scope is confirmed in writing before implementation begins. Any tax that is legally required must still be disclosed and collected correctly.

## Implemented foundation

- Polished responsive marketing site with pricing, methodology, sample report, contact, authentication, customer dashboard, legal pages, and checkout results.
- Supabase Auth client and row-level-security-aware customer workspace.
- Rate-limited contact function backed by a server-only Supabase RPC.
- Server-created Stripe-hosted Checkout with exact catalog prices, idempotency, explicit API versioning, and a test Payment Link fallback.
- Signature-verified, retry-safe Stripe webhook with synchronous and delayed-payment handling, exact price validation, and confirmed-email ownership linking.
- Structured review data with severity, confidence, affected users/tasks, selectors, evidence, WCAG references, repair effort, proposed fixes, and retest results.
- Randomized, hashed, human-approved private concept links with `noindex`, 14–30 day expiry, no external assets, and no connection to inventory, accounts, or checkout.
- Passive public-homepage scanner using Playwright and axe-core. It blocks private/reserved destinations and non-GET/HEAD requests, and emits candidate evidence that still requires human review.
- Prospect, public-contact provenance, permanent suppression, outreach draft, human approval, opt-out, and audit records.
- Database-enforced maximum of 20 queued/scheduled/sent outreach messages per UTC day.
- Optional Google Sheets review handoff that does not request Gmail permissions or send mail.
- Netlify free-tier deployment configuration and GitHub Actions CI.

## Local development

Use Node.js **22.12 or newer**.

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

## Passive homepage scanner

Install the local Chromium runtime once:

```bash
npx playwright install chromium
```

Run one explicitly selected public homepage:

```bash
npm run scan -- --url https://store.example --out artifacts/scans/store-example
```

The scanner does not discover targets, harvest contact details, submit forms, click links, create accounts, enter checkout, use credentials, probe private routes, or attempt exploitation. Its JSON output is marked `candidate_needs_human_review`; automated results are never the source of truth for a prospect-facing claim.

## Supabase setup

1. Confirm that you are in a **dedicated AccessRevamp Supabase project**. Do not apply these migrations to a database that belongs to another application.
2. Apply every SQL file in `supabase/migrations/` in filename order.
3. Copy the project URL and publishable key into `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Add the service-role key only as the server-side `SUPABASE_SERVICE_ROLE_KEY` deployment secret.
5. Configure Supabase Auth site and redirect URLs for the final deployment URL.
6. Run the Supabase security and performance advisors after the complete migration set is applied.

Never expose the service-role key in browser code, a `VITE_` variable, Git, a Sheet, or an outreach record.

## Private previews

After migration `202607170005_complete_review_and_preview_model.sql` is applied, prepare a reviewed JSON file and create a temporary link:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
ACCESSREVAMP_SITE_URL=https://your-site.netlify.app \
node scripts/create-private-preview.mjs preview.json
```

The command prints the raw private URL once. Supabase stores only a SHA-256 token hash. Every rendered page is watermarked **“Private AccessRevamp Concept · Not the live website”**, sends `noindex` headers, uses no third-party assets, and stops working after expiry or revocation.

See `docs/PRIVATE_PREVIEWS.md` for the input format and operating rules.

## Stripe sandbox state

The repository uses the AccessRevamp Stripe sandbox catalog:

- Homepage Reveal: `price_1TuGoNLzyGRcyGQJRjtGsiMV` — **$50 USD one time**
- Quick Fix Plan: `price_1TuGoTLzyGRcyGQJfdkqoE3f` — **$199 USD one time**

The default fallback URLs are test links. Replace them with live-mode values only after the Stripe account is activated, business details are complete, a restricted server key is available, and the full live test matrix has passed. Set `STRIPE_EXPECT_LIVEMODE=false` in sandbox and `true` in production.

## Netlify deployment (free URL)

1. Import this repository into Netlify.
2. Netlify reads `netlify.toml`; the build output is `dist` and server functions are in `netlify/functions`.
3. Add every required variable from `.env.example` in Netlify’s environment settings.
4. Generate a random `CONTACT_RATE_LIMIT_SECRET` of at least 24 characters.
5. Deploy and verify `/.netlify/functions/health`.
6. Add the webhook endpoint `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook` in Stripe.
7. Subscribe it to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`.
8. Test both one-time purchases, account confirmation, order linking, cancellation, delayed payment, duplicate webhook delivery, and an invalid-price event.

The initial free address is a `*.netlify.app` URL. A custom domain and business mailbox can be added after the business identity is ready.

## Outreach remains approval-gated

The code intentionally does not contain an unattended bulk-mail loop. Before any sender is enabled, configure a real sender identity, reply-capable mailbox, valid postal address, final site URL, opt-out handling, suppression, bounce/complaint processing, and the relevant legal requirements for each recipient jurisdiction.

Every prospect-facing finding must be based on evidence and approved by a person. Use accessibility **severity** and **confidence** labels. Do not describe passive signals as proven security vulnerabilities, claim legal noncompliance, threaten lawsuits, estimate lost revenue without real analytics, use fake `Re:`/`Fwd:` subjects, or evade an opt-out by contacting another employee.

See `docs/OUTREACH_STANDARD.md` and `docs/REVIEW_PIPELINE.md`.

## Required launch values not stored in Git

- Dedicated AccessRevamp Supabase project and its publishable/server keys.
- Final monitored contact email.
- Real business identity and valid postal address.
- Netlify site connection and generated public URL.
- Restricted Stripe server key, webhook signing secret, and live-mode catalog values after activation.
- Final privacy, terms, refund, and outreach review for the operating jurisdiction.

Secrets belong in the deployment provider, never in this repository.
