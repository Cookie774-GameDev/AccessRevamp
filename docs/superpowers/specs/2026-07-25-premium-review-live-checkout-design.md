# Premium Review and Live Checkout Design

## Objective

Turn the final order-review step into a credible premium project package and restore the existing server-created Stripe Checkout flow. Customers must understand the value of the selected plan, be able to inspect AccessRevamp's working portfolio, and receive an explicit status if checkout is unavailable.

## Confirmed root cause

The production payment-health endpoint returns `503 {"ready":false}`. Supabase currently reports:

- `checkout_enabled = false`
- `expected_livemode = true`
- `live_payment_approved = true`
- six active live catalog transitions
- a recently verified configuration timestamp

The client button is wired correctly, but the server-side payment kill switch deliberately prevents Checkout Session creation. Enabling it is allowed only after the live secrets, price catalog, webhook endpoint, database settings, and payment-health endpoint pass verification.

## Experience design

### Review package

The final step will present the selected plan as a commissioned project package rather than a plain feature list:

- a prominent plan name and amount-due block;
- grouped deliverables with premium visual hierarchy;
- a concise three-stage post-payment timeline;
- assurance notes for private project storage and Stripe-hosted payment;
- a direct “Explore our working websites” link to `/portfolio`, opening in a new tab so the form remains intact;
- project details kept compact and secondary to the deliverables.

The aesthetic remains within the existing AccessRevamp ink, warm gold, cream, and coral system. The signature element is a gold “project folio” frame surrounding the deliverables, using layered borders and a restrained light sweep rather than generic gradient cards.

### Checkout action

Stripe Checkout remains hosted at `checkout.stripe.com`. The action:

1. validates the complete form;
2. confirms an authenticated Supabase session;
3. saves the private project draft and references;
4. requests one server-created, idempotent Checkout Session;
5. validates the returned Stripe hostname;
6. redirects the current tab to Stripe.

The page will preflight `/api/payment-health` when the review step opens. A ready response presents “Secure checkout ready.” An unavailable response keeps the button visible but disabled and explains that payment is temporarily unavailable; it does not silently fail.

## Payment activation

Before changing the kill switch:

1. confirm Cloudflare has the required Stripe and Supabase secrets without exposing values;
2. confirm six active live catalog transitions match the approved amounts;
3. confirm the live Stripe webhook endpoint and signing secret are configured;
4. confirm no unresolved critical payment incident exists;
5. refresh `configuration_verified_at`, set a clear maintenance reason, and enable checkout in one guarded database update;
6. require `/api/payment-health` to return HTTP 200;
7. create an authenticated Checkout Session in a controlled test without completing a charge.

If any gate fails, checkout remains disabled and the exact blocker is reported.

## Security and failure behavior

- No Stripe secret or price identifier enters browser code.
- No payment is inferred from a browser redirect.
- The existing signed-webhook fulfillment remains authoritative.
- Duplicate clicks remain collapsed by the browser lock and server idempotency key.
- The customer sees safe, actionable errors; internal configuration details remain server-only.
- Portfolio links use `target="_blank"` with `rel="noopener noreferrer"`.

## Verification

- Test-first source assertions for the premium package, portfolio link, readiness UI, and server-created Checkout redirect.
- Unit coverage for ready, unavailable, and network-failure health states.
- Existing isolated payment stress and payment-guardrail tests.
- Full lint, unit test, production build, security scan, responsive browser QA, and production smoke tests.
- Live payment health must be 200 before the release is called complete.

