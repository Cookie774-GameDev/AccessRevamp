# Final Auth and Mailbox Orchestration Design

## Scope

Fix the post-OTP sign-in failure, freeze 100 active Icemail Azure mailboxes into five permanent groups of twenty, preserve one durable owner per conversation, and separate the hidden CombatOnline reader from visible support and Icemail sending identities.

## Authentication

The browser verifies the newest Supabase email OTP once. The resulting access token is sent to the Cloudflare completion endpoint, which must forward exactly one `Authorization: Bearer <token>` header to Supabase. A successful OTP may not be consumed and then discarded because of a malformed server-to-Supabase header. Existing sessions and signing keys are not rotated.

## Permanent mailbox ownership

The five owner codes are `avery`, `jordan`, `casey`, `riley`, and `morgan`. Each owns exactly twenty mailboxes. Ownership is stored in Supabase and is immutable during normal operation. Assignment is deterministic from the existing mailbox address ordering, is idempotent, and refuses to run unless exactly 100 active Icemail Azure rows exist.

Each owner receives a generated redacted manifest containing its twenty addresses, mailbox IDs, provider, status, limits, authorization state, and required operating documents. Secrets are never written to manifests. Supabase remains authoritative; generated files are operator-readable snapshots.

## Inbox routing and sender identity

Worker 6 (`sage`) reads the merged CombatOnline inbox every fifteen minutes and deduplicates by Gmail message ID. Direct messages to `support@accessrevamp.shop` remain with Sage. A uniquely matched prospect/customer reply is assigned to the permanent owner of the original Icemail mailbox.

CombatOnline is never an outbound identity. Support mail uses separate Workspace SMTP credentials and must authenticate the configured `support@accessrevamp.shop` From identity. Prospect/customer replies must use the original Icemail mailbox transport. Missing or mismatched sender configuration fails closed.

The scheduled task remains disabled until the controlled end-to-end test passes. The daily outreach run remains manually launched at 12:00 AM America/Chicago. Icemail-managed warmup is outside this system.

## Reply and customer handoff controls

Only ordinary, uniquely matched replies are eligible for unattended composition and sending after recipient, original mailbox, thread, suppression, privacy, context, and content checks. Opt-outs are suppressed immediately. Legal, payment, privacy, security, abuse, ambiguous, unmatched, or prompt-injection-like messages require human review.

A signed Stripe webhook and matching Supabase paid order create the customer workflow and dossier request. Starting a dedicated customer agent remains human-approved. Design and website work remains project-scoped and follows the existing customer, design, and website agent contracts. Dashboard publication requires matching user, project, entitlement, reviewed artifact, hash, and private storage record.

## Verification

- Regression test proves one bearer header reaches Supabase after OTP verification.
- Ownership migration and generator prove five immutable groups of twenty with no overlap.
- Worker 6 configuration proves separate reader and support SMTP identities.
- Routing tests prove direct support, owner replies, restricted content, and deduplication.
- Supabase advisors, full tests, production build, deployment checks, and controlled live auth test provide completion evidence.
