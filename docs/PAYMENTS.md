# Payments, entitlements, and refunds

**Status:** Mixed — `IMPLEMENTED` signature/idempotency foundation, cumulative schema/RPC, guarded Stripe test catalog, and confirmed-user quote boundary; `PLANNED` Checkout/reconciliation/refund completion; `EXTERNALLY BLOCKED` connected database and Stripe test-mode evidence; and `LAUNCH-ONLY` live activation.

**Owner:** Payments engineering with database, product, operations, security, and finance/legal review.

**Authority:** [approved rebuild specification](superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md) and the [entitlements/payments plan](superpowers/plans/2026-07-18-accessrevamp-entitlements-payments.md).

## Catalog and exact arithmetic

All prices are USD, one-time, and server-authoritative.

| Purchase | Gross | Verified credit | Due now | Resulting entitlement |
| --- | ---: | ---: | ---: | --- |
| Homepage Reveal | $50 | $0 | $50 | Homepage Reveal |
| Complete Website Revamp | $200 | $0 | $200 | Complete Website Revamp |
| Cinematic Scroll Site | $250 | $0 | $250 | Cinematic Scroll Site |
| Homepage Reveal → Complete Website Revamp | $200 | $50 | $150 | Complete Website Revamp |
| Homepage Reveal → Cinematic Scroll Site | $250 | $50 | $200 | Cinematic Scroll Site |
| Complete Website Revamp → Cinematic Scroll Site | $250 | $200 | $50 | Cinematic Scroll Site |

The staged path `$50 + $150 + $50` equals $250. Credit comes only from settled, nonrefunded value attached to the authenticated confirmed user. Browser state, email input, query strings, analytics, or prior Checkout success pages never grant credit.

## Checkout authority

The browser sends `{ targetTier, requestId }` to a same-origin function. The function enforces method, origin, content type, body size, strict schema, authenticated confirmed identity, and random request ID. A transaction locks the entitlement, expires conflicts, computes settled credit, validates a higher target, creates a 30-minute reservation, and selects the server-only full or upgrade Stripe Price ID.

Checkout uses one exact line item, verified customer identity, required billing address, controlled success/cancel destinations, no client-selected promotion code, and an idempotency key derived from the user, target, and request. The response exposes only a validated Stripe-hosted URL and safe reservation summary.

Required Checkout metadata fields are:

1. `user_id`
2. `reservation_id`
3. `from_tier`
4. `to_tier`
5. `gross_cents`
6. `credit_cents`
7. `net_cents`
8. `source_entitlement_id`
9. `checkout_request_id`

Stripe Price IDs, secret keys, webhook secrets, and service-role credentials stay in server environment variables. No new browser `VITE_*` payment identifier or direct Payment Link is permitted.

## Webhook reconciliation

The webhook reads the raw request body, verifies the signature, records/deduplicates the event ID, and re-retrieves Checkout data where necessary. It verifies mode, payment status, currency, total, line-item Price ID, all metadata, authenticated user, reservation, and target tier against server records. An atomic path updates Stripe event, order, reservation, entitlement, project, and audit state.

Supported outcomes include checkout completion, async success, async failure, session expiry, full refund, partial refund, duplicate delivery, out-of-order delivery, and a recorded event whose first processing attempt fails. A duplicate processed event is harmless; a recorded unprocessed event remains retryable.

## Refund dependency model

A customer action creates a refund request, not a completed refund claim. Operator processing records provider refund ID, amount, reason, operator, timestamps, and dependency resolution. Refunding an earlier purchase after a later upgrade triggers settled-value recomputation. Unsupported entitlement is suspended or flagged for review rather than silently retained or revoked without disclosed handling. Duplicate refund events are idempotent and statutory rights remain unchanged.

## Required matrix

Automated/mocked tests cover every full purchase and upgrade, repeated clicks, reused request IDs, concurrent upgrade tabs, tampered target/metadata, wrong Price/amount/currency, expiration, async outcomes, replay/retry, base refund before and after upgrade, unconfirmed or different user, test/live mismatch, and full/partial/duplicate refunds. Controlled E2E uses Stripe test mode only.

## Delivery states

### IMPLEMENTED

The retained code verifies Stripe signatures, uses idempotency, validates existing exact prices, handles delayed payment, links confirmed users, and stores reviewed refund requests.

`202607180002_add_tier_entitlements.sql` implements the exact $0/$50/$200/$250 catalog, durable cumulative entitlements, short-lived upgrade reservations, and refund dependencies. `202607180003_add_payment_rpcs.sql` implements the service-only reservation boundary: it locks by user, expires stale reservations, reuses only an identical live request, rejects same-tier/downgrade checkout, verifies the source order remains fully paid, calculates exact cumulative credit, prevents a second live credit reservation across different targets, and returns no Stripe identifier.

`npm run stripe:test-catalog:sync` and `npm run stripe:test-catalog:verify` implement a test-only Stripe catalog boundary. Both refuse credentials that are not explicit test secret keys. Synchronization uses stable lookup and idempotency keys for the three exact products and six one-time USD prices, reuses verified objects, refuses mismatched managed definitions, leaves unrelated objects untouched, and archives only an integration-marked $199 legacy test price after checking all open Checkout Sessions. Output contains product names, cents, test mode, and configured/missing environment-variable names only—never provider IDs or secrets.

`requireConfirmedUser` accepts one bounded Bearer token, verifies it with Supabase Admin `auth.getUser`, requires a confirmed email claim, and returns only normalized verified identity. The entitlement quote endpoint accepts only a strict paid target-tier object after same-origin, content-type, declared-size, and actual UTF-8 byte checks. It reads only the authenticated user's active entitlement through the server client, validates exact settled value, rejects same-tier/downgrade transitions, and returns only target, list price, credit, due-now value, and resulting tier. Browser-provided email, paid value, reservation, amount, or provider identifier is never accepted.

### PLANNED

Server-only catalog projection, reservation-backed Checkout boundary, nine-field metadata, atomic reconciliation, refund dependency transitions, account quote UI, and operator recovery paths remain specified for implementation.

### EXTERNALLY BLOCKED

The reservation structural/security contract passes, but `supabase test db` cannot connect because no local Supabase Postgres runtime is available. The Stripe catalog contract and mocked behavior pass, while remote verification stops with the explicit missing `STRIPE_SECRET_KEY` prerequisite; no Stripe object was created or changed. Confirming the six test prices, inspecting configured webhooks, applying migrations to a nonproduction Supabase branch, executing the concurrent-reservation SQL test, and retaining complete test-mode E2E evidence require connected authorized environments.

### LAUNCH-ONLY

Live products/prices, live keys, tax settings, production webhook, real transaction, payout/refund operations, and mode switch require explicit approval, business readiness, legal/finance review, monitoring, and rollback signoff.

## Validation

The entitlement/reservation structural-security suite passes 6/6 tests, and the guarded Stripe catalog suite passes its exact-definition, credential refusal, idempotency, unrelated-object, open-session, and output-redaction tests. Still required: clean-database and retained-chain migration execution, SQL race tests, remote Stripe test-catalog verification, Checkout/webhook integration and replay tests, test-mode E2E, secret/bundle scans, and a manual operator refund rehearsal. Never log full Stripe objects or environment values.
