# Quality and verification strategy

**Status:** `IMPLEMENTED` baseline and local gate, `PLANNED` full rebuild verification, `EXTERNALLY BLOCKED` owned-staging integration/load/security evidence, and `LAUNCH-ONLY` release signoff.

**Owner:** Quality engineering with frontend, backend, database, payments, accessibility, security, design, and operations owners.

**Authority:** [approved rebuild specification](superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md) and the [cinematic/quality/deployment plan](superpowers/plans/2026-07-18-accessrevamp-cinematic-quality-deployment.md).

## Evidence rule

A passing narrow test proves only its covered behavior. Source inspection is not proof of a deployed integration. Missing, stale, indirect, or unauthorized evidence remains incomplete. Every final requirement maps to a command, fixture, browser journey, database query, provider record, rendered artifact, or explicit external blocker.

Implementation uses red-green-refactor for features and root-cause-first debugging for failures. Each task keeps `npm run check` green and commits an independently reviewable unit. Generated evidence is secret-safe and records tool/version, target, time, configuration, result, known warning, and artifact path.

## Test layers

- Unit: catalog arithmetic, route matching/cleanup, validation, states, formatting, analytics allowlist, and pure reconciliation decisions.
- Contract: browser/server catalog agreement, safe projections, function schemas, metadata, docs, design tokens, asset provenance, and route inventory.
- Database: clean and upgrade migration apply, constraints, RPC transactions, RLS allow/deny, grants, indexes, races, refund dependencies, and recovery.
- Server integration: origin/method/body limits, auth, same-origin writes, mocked Stripe calls, idempotency, webhook fixtures/replay, logging, and error mapping.
- Browser E2E: direct routes/history, keyboard/touch, forms, auth/account states, checkout states, previews, demos, reduced motion, errors, and cleanup.
- Controlled external: Stripe test-mode payments and webhooks, nonproduction Supabase, Netlify preview, and only authorized owned-target load/security checks.

## Accessibility matrix

Target WCAG 2.2 AA without certification language. Verify semantic landmarks and headings, labels/instructions/errors, error summary and focus, live status, keyboard/touch parity, visible focus, dialog/menu/cart/estimator behavior, screen-reader names, forced colors, reduced motion, 200% zoom, and 320-pixel reflow. Axe is a regression tool, not the full review.

Baseline findings are color contrast on home/pricing and heading order on pricing/work. Final acceptance requires zero serious/critical axe violations and deliberate resolution of all baseline defects, with any remaining lower-impact exception documented and approved.

## Browser and viewport matrix

Playwright covers Chromium, Firefox, and WebKit. Required visual/functional sizes are 1440×900, 1280×800, 1024×768, 768×1024, 390×844, and 375×667, plus 320-pixel reflow and 200% zoom. Test standard pages, all three demos, account/operator/private preview, cinematic static/reduced/full paths, and error states.

## Performance budgets

| Measure | Standard routes | Cinematic route |
| --- | ---: | ---: |
| Lighthouse performance | ≥90 | ≥85 |
| Accessibility / best practices / SEO | ≥95 each | ≥95 each |
| Initial JavaScript | <180 KB gzip unless approved exception | Same shared budget plus measured route-local media |
| CSS | <70 KB gzip | <70 KB gzip |
| Initial transfer | <1.5 MB | <1.5 MB before intentionally requested media |
| Hero poster | <250 KB | <250 KB |

Slow-4G and CPU-throttled primary journeys must remain comprehensible and operable. Media uses dimensions, posters, lazy loading, bounded decoding, visibility pausing, and no unnecessary multi-megabyte payload.

## Payment, security, load, and recovery

Run the complete full-purchase/upgrade/refund matrix in `docs/PAYMENTS.md`; secret and bundle scans; dependency audit; headers/CSP; auth/IDOR/RLS; preview token; suppression; checkout tamper/race; webhook replay/retry; and safe-log checks. k6/Locust/ZAP/Nuclei are restricted to explicitly authorized owned staging with conservative rates. Exercise stuck reservation, webhook mismatch, partial outage, backup, forward recovery, and rollback decisions.

## Delivery states

### IMPLEMENTED

The local suite, static policy checks, production build, dependency audit, browser baseline, screenshots, axe, Lighthouse, console/network capture, and evidence redaction are operating. The baseline is not final acceptance.

### PLANNED

Feature contracts, all route/demo E2E, database/payment matrices, final visual/accessibility/performance passes, evidence manifest, load/security/recovery exercises, and the 22-part handoff remain scheduled.

### EXTERNALLY BLOCKED

Deployed integration, Core Web Vitals field data, Stripe test E2E, Supabase remote advisors, owned-target load/security tools, and Netlify preview headers require confirmed external systems and authorization.

### LAUNCH-ONLY

Final release signoff, production smoke tests, monitoring validation, domain checks, legal/accessibility review, and go/no-go decision occur only after separate launch approval.

## Core commands

Run `npm ci`, `npm run check`, `npm audit --omit=dev --audit-level=high`, targeted migration/payment/browser suites, `npm run baseline` only for the preserved pre-change process, and the final evidence scripts defined by the quality plan. Do not overwrite pre-rebuild evidence with post-rebuild output; final artifacts use a separate dated directory.
