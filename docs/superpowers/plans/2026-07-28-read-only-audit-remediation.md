# Read-Only Audit Remediation Implementation Plan

> **For agentic workers:** This plan is being executed inline by the main agent. Subagents are explicitly prohibited for this remediation.

**Goal:** Correct every reproducible defect in the July 28 strict read-only audit without misrepresenting accepted operational exceptions as completed evidence.

**Architecture:** Preserve the existing Cloudflare Worker, shared server handlers, Stripe Checkout, and Supabase transaction boundaries. Tighten event-specific payment telemetry, dispute reconciliation, browser-secret handling, upload validation, checkout host binding, draft retention, and production CI while removing unsupported public claims and obsolete deployment authority.

**Tech Stack:** Node.js 22, native ES modules, Next/Vinext, Cloudflare Workers, Stripe, Supabase Postgres/Auth/Storage, Node test runner, Playwright.

## Global Constraints

- Do not use or spawn subagents.
- Do not create a charge, refund, dispute, order, entitlement, or customer record.
- Taxes, successful Checkout evidence, Worker 6, and scheduling remain accepted external/operational exceptions.
- Use test-first regression coverage for every behavior change.
- Keep production payment and database mutations fail-closed and idempotent.
- Preserve the current public design except where unsupported claims or misleading copy must be corrected.

---

### Task 1: Payment event outcome telemetry and disputes

**Files:**
- Modify: `netlify/functions/stripe-webhook.mjs`
- Create: `supabase/migrations/<generated>_separate_payment_event_outcomes.sql`
- Test: `tests/audit-remediation-round-two.test.mjs`
- Test: `tests/isolated-webhook-stress.test.mjs`

**Interfaces:**
- Consumes: verified Stripe events and the existing service-role Supabase client.
- Produces: event-specific timestamps, durable dispute reconciliation, and success timestamps updated only after relevant successful transactions.

- [x] Write tests proving irrelevant events cannot advance fulfillment liveness.
- [x] Write tests proving dispute events route through a dedicated reconciliation RPC.
- [x] Run focused tests and observe the expected failures.
- [x] Implement event classification and outcome-specific timestamp updates.
- [x] Add a forward migration for event timestamps and idempotent dispute state changes.
- [x] Apply and verify the migration on the connected project.

### Task 2: Authentication and private-route secret containment

**Files:**
- Modify: `netlify/functions/auth-login-start.mjs`
- Modify: `src/services/auth.js`
- Modify: `proxy.ts`
- Test: `tests/audit-remediation-round-two.test.mjs`

**Interfaces:**
- Consumes: the existing HttpOnly challenge cookie and Supabase email-code flow.
- Produces: no verification secret in query strings, no referrer propagation, and no caching on authentication or approval routes.

- [x] Write tests that reject `verification` query handling and require fragment/HttpOnly-cookie flow.
- [x] Run focused tests and observe failure.
- [x] Remove legacy query-token generation and consumption.
- [x] Add `no-referrer` and `no-store` protection to authentication and approval routes.

### Task 3: Truthful public claims and short-lived browser drafts

**Files:**
- Modify: `src/pages/home.js`
- Modify: `src/services/order-wizard.js`
- Modify: `src/services/session-navigation.js`
- Test: `tests/audit-remediation-round-two.test.mjs`

**Interfaces:**
- Consumes: order-form values and customer navigation events.
- Produces: no unsupported customer count, qualified delivery-target wording, expiring session-only drafts, explicit clearing, and sign-out cleanup.

- [x] Write failing tests for unsupported claim removal and draft expiration.
- [x] Replace the unsupported metric with a verifiable service indicator.
- [x] Store drafts in `sessionStorage` with a short TTL and schema version.
- [x] Clear drafts on expiry and successful checkout; tab-scoped storage clears when the browsing session ends.

### Task 4: Checkout host binding, customer reuse, and upload hardening

**Files:**
- Modify: `netlify/functions/create-checkout.mjs`
- Modify: `netlify/functions/order-draft.mjs`
- Modify: `netlify/functions/project-intake.mjs`
- Create: `netlify/functions/_shared/file-signatures.mjs`
- Test: `tests/audit-remediation-round-two.test.mjs`

**Interfaces:**
- Consumes: `ACCESSREVAMP_SITE_URL`, authenticated customer identity, and bounded multipart files.
- Produces: canonical return URLs, reusable mapped Stripe customers where available, and image-only uploads verified by MIME plus magic bytes.

- [x] Write failing contract and behavior tests.
- [x] Bind Checkout return URLs to the configured canonical production URL.
- [x] Reuse a verified existing Stripe customer when mapped; otherwise create one.
- [x] Restrict reference uploads to image formats and verify their signatures before storage.

### Task 5: Single deployment authority and enforced production smoke tests

**Files:**
- Delete: `.github/workflows/accessrevamp-finalize-v2.yml`
- Delete: `.github/workflows/accessrevamp-finalize-v3.yml`
- Delete: `.github/workflows/accessrevamp-finalize-v4.yml`
- Delete: `.github/workflows/accessrevamp-finalize-v5.yml`
- Modify: `.github/workflows/deploy-cloudflare-worker.yml`
- Create: `scripts/quality/verify-production-smoke.mjs`
- Modify: `package.json`
- Test: `tests/audit-remediation-round-two.test.mjs`

**Interfaces:**
- Consumes: the deployed production origin.
- Produces: one Cloudflare deployment authority and required post-deploy checks for public routing, real 404 behavior, private caching, and fail-closed payment endpoints.

- [x] Write failing workflow and smoke-script tests.
- [x] Remove obsolete write-capable finalizer workflows.
- [x] Add the production smoke command after deployment.
- [x] Retain CI/payment evidence longer and keep workflow permissions read-only.

### Task 6: Verification and truthful audit record

**Files:**
- Modify: `docs/PRELAUNCH_AUDIT_2026-07-27.md`
- Modify: `README.md`

- [x] Run focused regression tests.
- [x] Run full lint, tests, build, secret scan, dependency audit, and diff checks.
- [x] Run Supabase security/performance advisors and verify changed functions.
- [ ] Commit, push, monitor CI/deployment, and run live smoke checks.
- [x] Record fixed findings, rejected/outdated findings, accepted exceptions, and remaining external evidence without claiming a payment occurred.
