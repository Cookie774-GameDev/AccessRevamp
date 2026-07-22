# Skill: Payment Reconciliation

## Goal

Create exactly one durable customer project for one verified Stripe payment and preserve enough evidence to recover safely from retries, browser failures, duplicate webhooks, and provider timeouts.

## Authority order

1. Signed Stripe webhook and fresh Stripe object retrieval.
2. Supabase reservation, order, entitlement, project, and processed event.
3. Google Drive/Sheets ledger as secondary reconciliation evidence.
4. Browser redirect only as a prompt to poll; never as payment proof.

## Verification checklist

- Expected test/live mode matches Stripe, environment, and `payment_runtime_settings`.
- Event signature is valid.
- Checkout Session is in payment mode and paid.
- Exactly one line item and quantity one.
- Price ID matches the database catalog.
- Amount, currency, customer, request ID, reservation, transition, and entitlement credit match.
- Event, Session, PaymentIntent, reservation, order, and request identifiers are unique and internally consistent.
- The order is `paid`, the entitlement is active, the project exists, and the workflow was bootstrapped.

## Idempotency

Use a stable request UUID for the saved brief, Stripe Session creation, reservation, and metadata. Retry ambiguous provider responses with the same idempotency key. Process duplicate webhooks as duplicates, not new payments. Never ask the customer to pay again while reconciliation is unresolved.

## Ledger synchronization

Queue one `append_payment_ledger` outbox item keyed by the order ID. Write only non-secret identifiers, amount, status, project link, and verification state. The ledger must never change the payment state.

## Failure behavior

On mismatch, missing fulfillment, stale webhook, or unexpected mode: create a security incident, disable Checkout when required, block the workflow, preserve evidence, and show a processing/support message. Do not refund automatically.

## Refund boundary

Refunds remain disabled unless the existing two-person authorization, exact-order limit, expiry, idempotency, and webhook reconciliation all pass. No loop or bulk-refund operation is permitted.
