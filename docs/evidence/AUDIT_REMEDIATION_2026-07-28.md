# July 28 strict-audit remediation

This record addresses `AccessRevamp_Read_Only_Audit_2026-07-28(1).md`. It separates reproducible defects from owner-accepted launch holds and from findings contradicted by current implementation evidence.

## Reproducible findings corrected

- Removed the unsupported “87 happy customers” claim and its client animation.
- Removed login verification secrets from query strings and browser query parsing. Authentication routes now use `Referrer-Policy: no-referrer` and private no-store handling.
- Replaced indefinite order-wizard `localStorage` persistence with two-hour, tab-scoped `sessionStorage`, including expiry and successful-checkout cleanup.
- Bound Stripe success and cancel URLs to the configured canonical site origin. Live mode accepts only `https://accessrevamp.com`.
- Reused a verified prior Stripe Customer identifier when available instead of forcing a new customer for every attempt.
- Restricted intake uploads to JPEG, PNG, WebP, and AVIF and verify MIME type plus file signature before private storage.
- Separated webhook receipt telemetry from relevant checkout, fulfillment, refund, and dispute outcomes. Irrelevant signed events cannot refresh successful-webhook health.
- Added authoritative Stripe dispute retrieval, durable dispute records, fail-closed order/entitlement/project handling, and a service-role-only reconciliation RPC.
- Added an explicit restrictive browser-deny RLS policy for the dispute ledger.
- Removed four obsolete write-capable finalizer workflows. The Cloudflare deployment workflow is the single production deployment authority.
- Added a required post-deployment smoke gate for canonical routing, real 404s, private-route cache/referrer headers, unauthenticated checkout denial, and payment-health response shape.
- Increased CI artifact retention from 7 to 30 days.
- Made the refund summary and detailed policy consistently state that a valid request before final digital delivery is eligible for a full refund.

## Findings already protected or not supported by current evidence

- Checkout does not bypass the server readiness gate. The server resolves the plan and price, requires an authenticated matching draft, reserves checkout atomically, and fails closed when readiness is false.
- Payment health may return HTTP 503 when not ready; its JSON contract also contains `ready:false`.
- URL scanning already blocks private, loopback, link-local, credential-bearing, and unsafe targets and revalidates redirects.
- No exact duplicate index pairs were reported by the connected Supabase advisors. Unused-index notices are informational and are not sufficient evidence to delete guardrail or foreign-key indexes.

## Owner-accepted launch holds

These are intentionally not represented as completed:

- No successful customer payment, refund, or live webhook fulfillment exists yet because no customer has purchased.
- Automatic tax remains disabled pending the Louisiana tax determination.
- Worker 6 and its 15-minute schedule remain disabled.
- Automatic refunds remain disabled.
- Cold outreach remains disabled while the owner withholds a lawful postal address.

## Verification evidence

- Focused audit/security tests: 32 passed.
- Full Node test suite: 407 passed.
- Static lint: passed across 359 files.
- Production build: passed.
- Requirements matrix verifier: 10 requirements, 0 failures.
- Secret scan: 0 findings.
- Production dependency audit: 0 vulnerabilities.
- Supabase migration history contains `separate_webhook_outcomes_and_disputes` and `deny_browser_payment_disputes`.
- Supabase dispute RPCs are executable by `service_role` and not by browser roles.
- Supabase security advisor has one remaining external warning: leaked-password protection is disabled.

Deployment and live smoke evidence are recorded by the canonical Cloudflare deployment workflow for the commit containing this document.
