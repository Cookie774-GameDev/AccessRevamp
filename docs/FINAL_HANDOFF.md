# AccessRevamp rebuild handoff

## 1. Executive summary

The rebuild implements the editorial diagnostic-lab public experience, one-time cumulative catalog, authenticated payment boundary, three original working demos, structured report/export workflow, customer and operator workspaces, secure previews, and a queue-only suppression-first outreach workflow.

## 2. Product decisions

The service remains one-time, evidence-led, and human-reviewed. Passive public observations never become active testing without separate authorization. Concepts and demos are disclosed; fabricated outcomes are prohibited.

## 3. Changed frontend groups

Public pages and shared design live in `src/pages`, `src/components`, and `src/styles`; route-isolated demos live in `src/demos`; reporting lives in `src/report`; consent-aware event handling lives in `src/services/analytics.js`.

## 4. Changed server groups

Netlify Functions now cover confirmed-user quotes and checkout, Stripe webhook reconciliation, manual snapshot intake, safe customer projection, restricted operator reads/actions, private previews, queue-only outreach, contact, and unsubscribe.

## 5. Database migrations

The rebuild adds canonical entitlements/reservations/refund dependencies in `202607180002`, transactional payment RPCs in `202607180003`, and snapshot/account/operator/preview/outreach operations in `202607180004`.

## 6. RLS and grants

Internal tables enable RLS and revoke browser-role access. Sensitive RPCs are service-role only. Customer information is returned through an authenticated, minimized server projection.

## 7. Stripe changes

Guarded scripts synchronize exact test-mode prices. Checkout uses server reservations, authenticated confirmed users, server-owned Stripe price mapping, exact metadata, idempotency, and webhook-side retrieve/expand/verify.

## 8. Payment mode status

Local source is implemented for Stripe test mode. No remote test catalog/webhook transaction or live-mode switch is claimed. `ACCESSREVAMP_LIVE_PAYMENT_APPROVED` defaults false.

## 9. Upgrade calculations

$50 Homepage Reveal → $200 Complete Website Revamp applies $50 credit and charges $150. Homepage Reveal → $250 Cinematic applies $50 and charges $200. Complete → Cinematic applies $200 and charges $50.

## 10. Public and demo routes

Primary routes include `/`, `/portfolio`, `/pricing`, `/process`, `/free-snapshot`, `/sample-report`, `/methodology`, `/cinematic-scroll`, `/contact`, policies, account, and operator. Demo routes are `/portfolio/greenline-lawn-and-grounds`, `/portfolio/firejar-spicy-peanut-butter`, and `/portfolio/clearflow-plumbing`.

## 11. Report and PNG locations

The fictional structured report fixture is `tests/fixtures/sample-report.json`. `npm run export:sample-report` writes desktop/mobile PNGs and a hash manifest beneath `artifacts/sample-report` when a local preview is running.

## 12. Core commands

Use `npm run check`, `npm run verify:assets`, `npm run quality:local`, `npm run security:local`, `npm run verify:requirements`, and `npx playwright test`. External security/load commands require explicit owned-staging authorization.

## 13. Unit and contract evidence

Final local pass on July 18, 2026: static policy passed across 157 files; 130 tests passed, 0 failed; vinext/Sites and static SPA builds completed; four generated asset groups verified; ten requirements checked with zero failures; secret scan returned zero findings; the high-severity dependency audit gate and `git diff --check` passed. The dependency audit reports two moderate transitive Next/PostCSS advisories, with no safe nonbreaking resolution available in the current dependency line.

## 14. Lighthouse evidence

Final local Lighthouse reports belong under `docs/evidence/quality`. Existing baseline scores are historical and are not presented as final acceptance.

## 15. Core Web Vitals

Local browser measurements are lab evidence. No field INP or production Core Web Vitals claim is made without deployed traffic evidence.

## 16. Browser and accessibility matrix

The automated production-bundle matrix passed 48/48 checks: 16 Chromium, 16 Firefox, and 16 WebKit. It covers the required public routes, all three interactive demos, keyboard skip/primary actions, serious/critical axe findings, 320px width, 200% zoom, and horizontal overflow. Reduced-motion and fallback behavior also pass source contracts. Forced colors, slow-network timing, and failed-media visual review remain documented manual staging checks rather than overclaimed local evidence.

## 17. Authorized security

Local secret/header/auth contracts can run without external authority. ZAP/Nuclei or equivalent active work is not run without `AUTHORIZED_ACTIVE_TESTING=true` and an owned HTTPS staging target.

## 18. Authorized load

The k6 model caps load and enforces <1% error rate, public p95 <800ms, and function p95 <1500ms. It does not loop checkout or create charges. No run is claimed without authorization and tooling.

## 19. Known limitations

Remote Supabase migration/RLS proof, Stripe test transactions, deployed header verification, field performance, active security/load, final legal identity, and monitoring require an approved connected environment.

## 20. Launch blockers

Production remains blocked on domain ownership, production environment approval, secrets, migrations/backups, Stripe live catalog/webhook/tax decisions, legal/accessibility review, monitoring, rollback signoff, and explicit go-live authority.

## 21. Deployment and rollback

Deploy only an owned feature preview first. Use immutable app deploy rollback and reviewed database forward recovery. The procedure is in `docs/DEPLOYMENT.md` and `docs/ROLLBACK_REHEARSAL.md`.

## 22. Outreach confirmation

No outreach was sent. Sending remains disabled by default, no provider adapter is included, one follow-up is the maximum modeled sequence, and suppression/negative-response/complaint/bounce/no-response stops are durable.
