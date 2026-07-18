# Security model

**Status:** Mixed — `IMPLEMENTED` local controls, `PLANNED` rebuild hardening and verification, `EXTERNALLY BLOCKED` owned-staging evidence, and separately approved `LAUNCH-ONLY` operations.

**Owner:** Security owner with engineering, database, payments, privacy, and operations review.

**Authority:** [approved rebuild specification](superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md) and the [cinematic/quality/deployment plan](superpowers/plans/2026-07-18-accessrevamp-cinematic-quality-deployment.md).

## Trust boundaries

The public browser is untrusted. URL state, storage, typed email, catalog values, target tier, payment result pages, analytics, and client-rendered operator controls never grant authorization. Netlify Functions enforce same-origin/method/content-type/body-size/schema checks and authenticate server mutations. Supabase RLS and narrowly granted RPCs enforce row ownership and transitions. Stripe webhook signatures and server re-retrieval establish payment evidence.

Secrets exist only in deployment or connected-service secret stores. Stripe secret keys, webhook secrets, Supabase service-role keys, private-preview raw tokens, mail credentials, Google Drive credentials, and remote test authorization never enter Git, browser `VITE_*` variables, source maps, screenshots, reports, analytics, or ordinary logs.

## Public review boundary

The scanner and human review process are passive and limited to ordinary public-page retrieval. They exclude login, signup, accounts, admin, carts, checkout, private routes, forms, uploads, WebSockets, popups, state-changing methods, credentials, customer records, private/link-local/loopback/metadata destinations, exploitation, bypass attempts, stress testing, or vulnerability confirmation. Candidate tool output requires human verification before any external claim.

Active tools such as ZAP, Nuclei, k6, and Locust may run only against an owned, explicitly authorized nonproduction target. Evidence records owner, target, authorization, scope, rate, time, tool/version, result, and cleanup. Prospect sites and unrelated third parties are always out of scope.

## Application controls

- Strict schemas, bounded bodies, allowlisted origins/methods, safe response headers, and nonreflective error messages.
- Supabase RLS on every exposed table; service-only operational records; fixed-`search_path` security-definer functions; least-privilege grants and browser-role denial tests.
- Authenticated, confirmed-user requirement for entitlement credit; session-expiry and IDOR tests.
- HMAC-derived contact rate keys rather than raw IP storage; honeypot and size limits.
- Stripe raw-body signature verification, event idempotency/retry, exact mode/price/amount/currency/metadata verification, reservation locks, and refund-dependency reconciliation.
- Random private-preview tokens, stored only as hashes, with expiry, revocation, watermark, `noindex`, and no third-party assets.
- Permanent suppression, opt-out, daily outreach ceiling, human approval, and a global disabled sending switch.
- Restrictive CSP and security headers compatible only with required first-party, Supabase, and Stripe connections.
- Allowlisted structured logs with correlation IDs; no full request bodies, Stripe objects, free-form prospect/customer text, or tokens.

## Abuse and failure cases

Tests cover CSRF/origin bypass, oversized/malformed bodies, rate-limit evasion, auth expiry, cross-user reads, direct RPC execution, preview guessing/replay/expiry, checkout tampering, duplicate/concurrent reservations, webhook replay and out-of-order delivery, refund reversal ordering, suppression bypass, operator-action authorization, and secret leakage in source/bundles/evidence.

Security findings use evidence, severity, confidence, affected surface, reproduction limited to authorized scope, remediation, owner, status, and retest. Public copy never promises certification, total security, legal compliance, or exploit-free software.

## Delivery states

### IMPLEMENTED

Current code contains scanner egress/method bounds, same-origin server checks, rate limiting, RLS-aware data access, confirmed-email linking, Stripe signature/idempotency checks, preview hashing/expiry, suppression, audit records, and a disabled outreach posture. The dependency audit currently reports zero known vulnerabilities at the selected threshold.

### PLANNED

The rebuild adds catalog/entitlement RLS and race tests, refund dependencies, operator authorization projections, final CSP/header verification, secret/bundle/evidence scans, full negative journey coverage, and documented recovery exercises.

### EXTERNALLY BLOCKED

Remote advisors, deployed headers, owned-staging active scans, provider audit logs, webhook delivery behavior, and environment secret configuration require confirmed nonproduction systems and retained authorization.

### LAUNCH-ONLY

Production security review, domain/header validation, secret rotation, monitoring/alert routing, incident contacts, legal/privacy approval, live payment review, and production active testing require separate approval.

## Reporting and validation

Before public launch, publish a monitored security contact. Reports should include affected route and concise reproduction without secrets or personal data. Run `npm run check`, `npm audit --omit=dev --audit-level=high`, secret and built-bundle scans, RLS/RPC tests, payment tamper/replay/race tests, preview tests, header/CSP checks, and authorized staging scans. Record unresolved risk with owner, mitigation, and expiry.
