# AccessRevamp payment security runbook

## Default state

Checkout and automated refunds are intentionally fail-closed. `payment_runtime_settings.checkout_enabled` and `refunds_enabled` must remain `false` until every activation check below passes.

## Required separation of duties

Use three separate Stripe restricted keys:

- `STRIPE_CHECKOUT_SECRET_KEY`: create and expire Checkout Sessions; read only the Checkout objects needed by that function.
- `STRIPE_WEBHOOK_READ_SECRET_KEY`: retrieve Checkout Sessions, line items, charges, and refunds for signed webhook reconciliation; no refund creation.
- `STRIPE_REFUND_SECRET_KEY`: create a single refund only; do not grant product, price, customer, or webhook administration.

Never place any Stripe secret or the Supabase service-role key in a `VITE_` variable, browser bundle, repository secret-less config file, terminal transcript, or customer-visible response.

## Activation checklist

1. Deploy to a server-capable host. GitHub Pages can serve the interface but cannot execute `/api/*` or receive Stripe webhooks.
2. Configure the Supabase URL, publishable key, service-role key, the three restricted Stripe keys, the Stripe webhook signing secret, allowed origins, and test-mode flags.
3. Register the webhook endpoint for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.refunded`
   - `refund.updated`
4. Confirm all six rows in `stripe_price_catalog` match active Stripe test prices exactly.
5. Complete one authenticated test purchase and verify the same request ID appears in the draft, reservation, Stripe metadata, order, entitlement, and project.
6. Confirm the signed webhook writes `stripe_events.processed_at`, creates exactly one order, and remains idempotent when replayed.
7. Verify that an interrupted browser redirect reopens the same active Checkout Session and does not create another charge.
8. Verify that a canceled or expired session rotates to a fresh request UUID while preserving its saved request and private reference files.
9. Confirm `/success` shows a paid state only after `/api/checkout-status` finds the durable order, active entitlement, and project.
10. Set `configuration_verified_at` to the current UTC timestamp. Only then may an operator set `checkout_enabled=true`.
11. Do not enable live mode unless `expected_livemode=true`, `live_payment_approved=true`, live restricted keys are installed, and a separate live-mode review has been completed.

## Refund procedure

1. The customer submits one refund request for one order.
2. Operator A creates one refund authorization.
3. Operator B, a distinct active operator, approves it.
4. A guarded executor claims exactly that authorization and creates one Stripe refund with its stored idempotency key.
5. The signed Stripe webhook reconciles the provider result.

Automated refunds remain disabled until at least two active operators exist. Final delivery blocks automated execution. Any successful provider refund without a matching authorization opens a critical incident and automatically pauses automated refunds.

## Incident response

Review `payment_security_incidents` and `accessrevamp_audit_log` before changing payment settings. The scheduled anomaly scan runs every five minutes and reports stale Checkout reservations, unprocessed successful webhook events, incomplete paid orders, stale saved requests, and catalog mismatches.

A separate webhook-liveness job runs every five minutes. If an expired Checkout Session remains unreconciled for more than one hour, it opens a critical incident and automatically disables new Checkout attempts. Re-enable Checkout only after the webhook endpoint, signing secret, event mode, and durable fulfillment records have been reverified.

Never resolve an incident by deleting payment, event, reservation, authorization, or audit rows. Correct the configuration or reconcile the Stripe object, record the resolution, and retain the evidence.
