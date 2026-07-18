# AccessRevamp

**See the barrier. Preview the fix.**

AccessRevamp is an evidence-led website improvement studio for independent businesses. This repository contains the public portfolio and one-time service website, customer and operator foundations, private previews, Supabase data model, Stripe test-mode payment flow, and three original working demo sites.

**Current status:** Production rebuild in progress on a feature branch. Local foundations and pre-rebuild evidence are `IMPLEMENTED`; the exact catalog, entitlements, redesign, demos, and final verification are `PLANNED`; connected remote evidence is `EXTERNALLY BLOCKED`; production activation is `LAUNCH-ONLY`. No production switch or outreach sending is authorized.

## Canonical one-time catalog

| Tier | List price | Summary |
| --- | ---: | --- |
| Free Snapshot | $0 | One manually reviewed, evidence-backed public observation. No checkout or full audit. |
| Homepage Reveal | $50 | Human-reviewed report, one landing-page direction, desktop/mobile PNGs, implementation priorities, and a 30-day growth plan. |
| Complete Website Revamp | $200 | Applicable Homepage Reveal work plus an agreed responsive implementation of up to five standard content pages and a retest summary. |
| Cinematic Scroll Site | $250 | Complete Website Revamp scope plus one bounded cinematic single-page narrative with mobile and reduced-motion fallbacks. |

Every paid service is one time. Verified cumulative upgrades are:

- Homepage Reveal → Complete Website Revamp: $150 due.
- Homepage Reveal → Cinematic Scroll Site: $200 due.
- Complete Website Revamp → Cinematic Scroll Site: $50 due.
- The staged path `$50 + $150 + $50` totals $250.

Only the authenticated server and database may calculate entitlement credit. Stripe Price IDs, secret keys, webhook secrets, and Supabase service-role credentials never enter browser code or this document.

## Product boundaries

- The website distinguishes evidence, inference, recommendation, concept, implementation, and verified result.
- Every portfolio concept says: “Original working demo — not a client engagement.”
- Sample material is fictional or owned and never implies a real customer result.
- The scanner is passive and cannot submit forms, enter checkout, use credentials, probe private routes, or perform active testing.
- Private previews are human-approved, token-hashed, expiring, revocable, watermarked, and `noindex`.
- Outreach requires provenance, verified evidence, human approval, suppression, opt-out, and a database daily ceiling; `sending_enabled` remains `false`.
- Google Drive is internal operator context only and is never read by the public browser.
- Stripe stays in test mode until a separate explicit launch approval.
- When a written scope includes campaign creatives, production uses AI-assisted concept and copy generation with human review, rights checks, bounded formats, and a consolidated revision.

## Local development

Use Node.js 22.12 or newer.

```bash
npm ci
npm run dev
```

Run the complete local gate:

```bash
npm run check
npm audit --omit=dev --audit-level=high
```

Build and open the production preview:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

The preview intentionally has no deployment secrets. Contact submission, authentication, customer data, operator data, and server-created Checkout require the documented Netlify/Supabase/Stripe environment categories.

## Repository map

- `src/app/` — routing, metadata, lifecycle, and application boundaries.
- `src/components/` — reusable semantic UI.
- `src/pages/` — public, customer, operator, policy, result, and preview routes.
- `src/demos/` — route-isolated Greenline, Firejar, and Clearflow working demos.
- `netlify/functions/` — server-authoritative validation and orchestration.
- `supabase/migrations/` — forward migrations, RLS, grants, constraints, and RPCs.
- `tests/` — unit, contract, integration, policy, browser, accessibility, and payment checks.
- `scripts/` — safe local tooling for evidence, export, catalog sync, and verification.
- `docs/` — operating model, plans, evidence, deployment, and final handoff.

## Required environment categories

Use `.env.example` as the name-only inventory. Values belong in local or deployment secret stores.

- Public site URL and monitored public contact address.
- Supabase URL and publishable browser key.
- Supabase server URL/service-role credential for Netlify Functions only.
- Stripe test secret, webhook secret, expected mode, and server-only catalog mapping.
- Operator authorization and private-preview configuration.
- Owned staging URL and explicit active-test authorization.
- Optional consent-aware analytics transport.

Never commit values, copy them into Google Drive/Sheets, expose them through `VITE_*`, or retain them in screenshots, logs, reports, source maps, analytics, or prospect records.

## Documentation

- [Product operating model](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design system and inspiration record](docs/DESIGN.md)
- [Payments, entitlements, and refunds](docs/PAYMENTS.md)
- [Data model and authorization](docs/DATA_MODEL.md)
- [Security model](docs/SECURITY.md)
- [Outreach operations](docs/OUTREACH.md)
- [Quality strategy](docs/QUALITY.md)
- [Deployment and rollback](docs/DEPLOYMENT.md)
- [Third-party inventory](docs/THIRD_PARTY.md)
- [Approved rebuild specification](docs/superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md)
- [Pre-rebuild baseline](docs/baseline/2026-07-18.md)

Six detailed plans under `docs/superpowers/plans/` execute the rebuild in dependency order: foundation/catalog, entitlements/payments, account/operations, public experience/reports, portfolio demos, and cinematic/quality/deployment.

## Verification and launch boundary

The pre-rebuild browser baseline is retained under `docs/evidence/baseline/2026-07-18/`. Post-rebuild evidence uses a different dated directory and must cover routes, responsive screenshots, accessibility, Chromium/Firefox/WebKit, performance budgets, database/RLS, payment/refund matrices, secrets, headers, authorized security/load testing, recovery, deployment, and rollback.

Source code is not proof that a remote integration is configured. Missing Netlify, Supabase, Stripe, analytics, security, load, or production evidence remains incomplete and must be reported as such.
