# AccessRevamp

**See the barrier. Preview the fix.**

AccessRevamp is an AI-assisted accessibility remediation studio for independent storefronts and service businesses. The public site explains the offer, shows sample and portfolio work, supports contact and customer accounts, and sells three clearly scoped one-time services. The repository also contains the internal evidence, private-preview, payment, delivery, refund-request, and approval-gated outreach foundation.

## Commercial catalog

| Service | Price | Billing | Scope |
|---|---:|---|---|
| AccessRevamp Snapshot | Free | No checkout | One human-verified accessibility finding, one usability/design opportunity, evidence, and a private first-screen concept used for qualified outreach. |
| Homepage Reveal | **$50** | One time | Human-reviewed homepage findings, evidence, severity and confidence labels, WCAG references, a prioritized repair plan, and the complete first-screen concept reveal. |
| Quick Fix Plan | **$199** | One time | The agreed full website revamp, reviewed findings, accessibility/usability/responsive checks, retest notes, practical customer-reach and monetization recommendations, and a 10-piece AI-assisted Canva-ready marketing creative pack. |
| Cinematic Scroll Site | **$250** | One time | One responsive single-page microsite with one scroll-scrubbed AI-assisted motion sequence, up to four story beats, one primary CTA, reduced-motion/mobile fallbacks, deployment-ready source, and one consolidated revision round. |

There are no subscriptions, recurring AccessRevamp platform charges, hidden implementation tiers, or separate processing surcharges. Scope is confirmed in writing before implementation begins. Any tax that is legally required must still be disclosed and collected correctly.

## Cinematic Scroll Site

The **$250 one-time Cinematic Scroll Site** is the bounded motion offer:

- One single-page microsite.
- One scroll-scrubbed sequence with up to four story beats.
- One primary call to action and essential copy integration.
- AI-assisted media exploration using Higgsfield or a comparable provider when appropriate and available.
- Human review of media, claims, asset rights, responsive behavior, and fallbacks.
- Native scrolling, real HTML copy and links, reduced-motion support, and a lighter mobile path.
- Deployment-ready source and one consolidated revision round.
- Target final delivery within three business days after payment and complete intake.
- Full refund requests accepted before final digital delivery.

The offer excludes extra pages, ecommerce or account backends, custom 3D production, paid stock or model licenses, filming, ongoing hosting management, and unlimited revisions unless separately agreed in writing.

See `docs/CINEMATIC_SCROLL_SITE.md` and `docs/REFUND_AND_CANCELLATION_POLICY.md`.

## Quick Fix marketing creative pack

The **$199 one-time Quick Fix Plan** includes a cost-controlled marketing creative package for one campaign or promoted offer:

- **10 Canva-ready variations** in total.
- **Two human-approved master creative directions**, each adapted into five common formats.
- Square feed: `1080 × 1080`.
- Portrait feed: `1080 × 1350`.
- Story or Reel cover: `1080 × 1920`.
- Landscape ad: `1200 × 628`.
- US Letter or A4 poster.
- Recommended headline, call to action, caption, channel, and posting context.
- One consolidated revision round.
- Client-provided brand assets and Canva Free-compatible elements by default so the production cost remains low.
- AI-assisted concept and copy generation with human review before delivery.

The package does **not** include ad spend, media buying, printing, paid stock licenses, photography, complex motion design, or ongoing campaign management unless separately agreed in writing. Canva is a third-party service; AccessRevamp is not affiliated with or endorsed by Canva.

See `docs/MARKETING_CREATIVE_PACK.md` for the complete production and quality standard.

## Refund and delivery boundary

A customer may request a full refund before final digital delivery. Final delivery means the completed files, report, final delivery link, or published agreed website has been made available. After delivery, change-of-mind refunds are not offered; material defects and missing agreed items are corrected, and statutory rights remain unaffected.

Homepage Reveal and Cinematic Scroll Site target final delivery within three business days after payment and complete intake. Quick Fix reviewed findings, initial design direction, and creative-pack deliverables target the same window; the full implementation date is confirmed after scope, access, content, and dependencies are known.

The authenticated customer workspace can store a pre-delivery refund request, but the actual Stripe refund remains a reviewed operator action.

## Implemented foundation

- Polished responsive marketing site with pricing, methodology, sample report, portfolio, contact, authentication, customer dashboard, legal pages, refund policy, and checkout results.
- Original cinematic scroll-site portfolio concept using native scrolling, a pinned Canvas timeline, real HTML content, mobile behavior, and reduced-motion fallback.
- Supabase Auth client and row-level-security-aware customer workspace.
- Rate-limited contact function backed by a server-only Supabase RPC.
- Server-created Stripe-hosted Checkout with exact catalog prices, idempotency, explicit API versioning, and test Payment Link fallbacks.
- Signature-verified, retry-safe Stripe webhook with synchronous and delayed-payment handling, exact price validation, and confirmed-email ownership linking.
- Structured delivery fields and RLS-protected customer refund requests that close after final delivery.
- Structured review data with severity, confidence, affected users/tasks, selectors, evidence, WCAG references, repair effort, proposed fixes, and retest results.
- Randomized, hashed, human-approved private concept links with `noindex`, 14–30 day expiry, no external assets, and no connection to inventory, accounts, or checkout.
- Passive public-homepage scanner using Playwright and axe-core. It blocks private/reserved destinations and non-GET/HEAD requests, and emits candidate evidence that still requires human review.
- Prospect, public-contact provenance, permanent suppression, outreach draft, human approval, opt-out, and audit records.
- Database-enforced maximum of 20 queued/scheduled/sent outreach messages per UTC day.
- Optional Google Sheets review handoff that does not request Gmail permissions or send mail.
- Structured $199 marketing-creative specification with ten tracked variations, human approval, client ownership checks, and low-cost AI-assisted production rules.
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
- Cinematic Scroll Site: `price_1TuNWjLzyGRcyGQJ5NNWNU88` — **$250 USD one time**

The default fallback URLs are test links. Replace them with live-mode values only after the Stripe account is activated, business details are complete, a restricted server key is available, the refund workflow has been reviewed, and the full live test matrix has passed. Set `STRIPE_EXPECT_LIVEMODE=false` in sandbox and `true` in production.

## Netlify deployment (free URL)

1. Import this repository into Netlify.
2. Netlify reads `netlify.toml`; the build output is `dist` and server functions are in `netlify/functions`.
3. Add every required variable from `.env.example` in Netlify’s environment settings.
4. Generate a random `CONTACT_RATE_LIMIT_SECRET` of at least 24 characters.
5. Deploy and verify `/.netlify/functions/health`.
6. Add the webhook endpoint `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook` in Stripe.
7. Subscribe it to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`.
8. Test all three one-time purchases, account confirmation, order linking, cancellation, delayed payment, duplicate webhook delivery, an invalid-price event, a pre-delivery refund request, and the delivered-project refund cutoff.

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
- Final privacy, terms, refund, creative-rights, AI-provider, and outreach review for the operating jurisdiction.

Secrets belong in the deployment provider, never in this repository.

## Editorial Story preview

The July 2026 rebuild uses a single Vite entry point, explicit route modules, reusable page components, and lifecycle cleanup. Its public design system is warm canvas, deep ink, ultramarine, sun yellow, and restrained persimmon. The portfolio contains seven original fictional concepts and never represents them as commissioned client work.

Run the production preview locally:

```bash
npm ci
npm run check
npm run preview -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/`. Direct routes such as `/work`, `/pricing`, `/contact`, `/dashboard`, and `/cinematic-scroll` are handled by the Netlify SPA redirect in production.

The local preview intentionally has no deployment secrets. Contact submission, Supabase authentication, customer data, and server-created Stripe Checkout need their documented environment values and Netlify Functions. The checked-in Stripe fallback catalog remains sandbox-only, and the internal Google Drive operations workspace is not referenced by browser code.
