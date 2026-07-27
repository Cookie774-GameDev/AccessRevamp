# Private Owner Command Center Design

## Outcome

The creative command center is not part of `accessrevamp.com`. It runs only on
the owner's Windows computer, binds to `127.0.0.1`, and uses a one-time local
session. Customer pages and public production APIs cannot discover or open it.

## Authority and data flow

Supabase remains the durable source of truth. Design agents register immutable
homepage, poster, Canva, cinematic, and page-reference versions against the
exact customer project. The private command center reads those records,
displays signed previews and exact source evidence, and writes owner decisions.

`Request changes` creates feedback and a durable task assigned to the submitting
agent. `Approve design` accepts visual quality but does not expose the work.
`Approve for customer delivery` is a separate action and is the only creative
approval that can unlock later customer publication.

## Local security boundary

- Bind only to `127.0.0.1`; never `0.0.0.0`.
- Require `SUPABASE_SERVICE_ROLE_KEY` in the local process, never browser code.
- Start with a cryptographically random bootstrap token.
- Exchange the bootstrap token for an HttpOnly, SameSite=Strict local session.
- Require a per-process CSRF token on every mutation.
- Apply no-store, frame denial, and restrictive content-security headers.
- Select an active owner operator from Supabase; fail if ownership is ambiguous.
- Never provide a customer-send or email action in the command center.

## Interface

The screen is a dense private production desk rather than a storefront:
project rail, review queue, large preview stage, source-evidence panel, version
history, critique composer, agent/task status, design approval, and separately
guarded delivery approval. It supports keyboard use, reduced motion, mobile
inspection, refresh, and clear fail-closed states.

## Postal record

The supplied candidate is recorded as `Creek Hollow Ave, Zachary, LA 70791`.
It is not a complete deliverable postal address because no street number was
provided. Outreach sending therefore remains disabled.

## Verification

Automated contracts prove the public route and API are absent, the server is
loopback-only, secrets stay server-side, critique creates a durable agent task,
approval gates remain separate, the expanded postal candidate is retained
without being treated as valid, and all agent/skill/design contracts require
owner approval before customer visibility.
