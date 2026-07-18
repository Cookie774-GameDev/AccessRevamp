# Private pricing links and pricing-card polish

## Scope

Change only the pricing experience and the minimum private-link infrastructure it requires. Keep the four canonical one-time prices, cumulative upgrade rules, checkout authorization, and every non-pricing public page unchanged.

## Visual direction

At desktop widths, Free Snapshot, Homepage Reveal, Complete Website Revamp, and Cinematic Scroll Site appear as one aligned four-card row. Tablet uses a balanced two-by-two grid; narrow screens use one column. Cards share equal structural height and align their actions without truncating content.

The $250 Cinematic Scroll Site is the single visual signature: a deep ultramarine-to-ink field, white primary text, mint metadata, a restrained sun accent, and a subtle luminous border. It remains legible in forced colors, has no color-only meaning, and removes decorative motion under reduced motion. The other three cards retain their current treatment.

The reference recording informs only the confident four-card rhythm and premium differentiation. No Zenmux copy, geometry, branding, code, or exact styling is copied.

## Private customer link

An authorized operator can create a customer-specific pricing context containing:

- Customer-facing label.
- Public website HTTPS URL.
- Short human-reviewed scope summary.
- Recommended canonical tier.
- Optional internal reference that is never returned publicly.
- Expiry time and revocation state.

Generation produces at least 32 random bytes and returns the raw token once. The database stores only a SHA-256 hash. The shareable URL uses a fragment, `/pricing#quote=<token>`, so the token is not sent in the initial HTTP request, hosting logs, or referrer. Browser code removes the fragment from visible history after reading it and sends the token in a bounded same-origin POST body to the resolver.

Each token resolves one unique record. Links expire, can be revoked, and are rate-limited. Resolution records a bounded audit event without storing the raw token. Invalid, expired, or revoked links reveal no customer context and leave the standard public pricing page fully usable.

## Personalized pricing state

When resolution succeeds, the pricing page adds a clearly labeled private context panel above the four cards. It displays the escaped customer label, linked public hostname, reviewed scope summary, and recommended tier. The recommended card receives a text badge and accessible emphasis.

Personalization never changes list prices, due-now values, Stripe Price IDs, entitlement credit, refund logic, or checkout metadata. Checkout remains authenticated and server-authoritative. The page states that the context is private, time-bounded, and not a guarantee of outcomes or final scope.

## Components and data flow

1. A forward-only Supabase migration adds the private pricing-context table, hash uniqueness, expiry/revocation constraints, service-only grants, indexes, and immutable audit integration.
2. A restricted operator endpoint issues and revokes links after allowlist authentication and same-origin validation.
3. A public resolver accepts only a bounded token body, hashes it, checks active/expiry state, and returns the minimized customer-facing projection.
4. A pricing-page service reads and erases the fragment, resolves context, renders safe states, and cleans up event listeners.
5. Existing pricing cards and checkout controls remain the only purchase controls.

## Failure and privacy behavior

- Missing token: render normal public pricing immediately.
- Malformed token: show a concise invalid-link notice without a network request.
- Unknown, expired, or revoked token: return the same generic unavailable response.
- Missing backend configuration or network failure: preserve normal prices and explain that private context could not load.
- Customer label, website, and scope text are escaped before insertion.
- Analytics may record only `private_pricing_opened` with status and tier; it must not receive the token, customer label, website, email, or scope.
- Responses use `Cache-Control: no-store`; the page keeps the existing no-secret browser boundary.

## Verification

Contract tests cover token entropy/hash-only storage, service-only grants, expiry/revocation, generic failure responses, safe projection, fixed catalog invariants, and analytics redaction. Browser tests cover public pricing fallback, successful personalized context, recommended-tier labeling, four-card desktop alignment, two-by-two tablet layout, mobile stacking, 320 CSS pixels, 200% zoom, keyboard order, reduced motion, and serious/critical axe findings. The full existing source, build, security, and three-engine browser gates run before publishing a new Sites version.

## Out of scope

No custom prices, discounts, customer-provided price arithmetic, automatic prospect outreach, live Stripe activation, production migration, or custom-domain change is authorized by this feature.
