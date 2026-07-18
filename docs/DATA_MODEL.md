# Data model and authorization

**Status:** Mixed — `IMPLEMENTED` retained operational schema, `PLANNED` entitlement/reservation/refund additions, `EXTERNALLY BLOCKED` remote project verification, and `LAUNCH-ONLY` production migration application.

**Owner:** Database engineering with payments, application, operations, privacy, and security review.

**Authority:** [approved rebuild specification](superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md) and the [entitlements/payments plan](superpowers/plans/2026-07-18-accessrevamp-entitlements-payments.md).

## Modeling rules

Postgres is the durable source of truth for identity-linked commercial and operational state. Forward migrations preserve existing meaning. Browser-provided tier, amount, credit, user identity, workflow status, operator approval, or payment outcome is never authoritative. Sensitive transitions use transactions or narrowly granted security-definer RPCs.

All exposed tables have RLS enabled. Customers read only their own appropriate profile, orders, entitlements, projects, deliverables, and refund requests. Internal research, evidence, preview secrets, suppression, queue, Stripe events, reservations, refund dependencies, and audit records remain service/operator only unless a deliberately minimized projection is defined.

## Planned catalog and entitlement tables

### `tier_catalog`

`tier_key`, `rank`, `list_price_cents`, `active`, server-only `stripe_full_price_id`, `created_at`, and `updated_at`. Constraints enforce exact known keys, nonnegative cents, unique rank, and one active definition per tier. Browser access uses a safe projection without Stripe identifiers.

### `entitlements`

`id`, `user_id`, `highest_tier_key`, `status` (`active`, `suspended`, `revoked`), `source_order_id`, `effective_paid_cents`, and timestamps. The model permits one active entitlement per user and links every effective state to settled evidence.

### `upgrade_reservations`

`id`, `user_id`, `from_tier_key`, `to_tier_key`, `gross_cents`, `credit_cents`, `net_cents`, server-only `stripe_price_id`, `status` (`reserved`, `checkout_created`, `paid`, `expired`, `canceled`, `reversed`), `expires_at`, `idempotency_key`, `checkout_session_id`, `source_entitlement_id`, and timestamps. Constraints enforce higher targets, exact arithmetic, expiration, and uniqueness/idempotency.

### `refund_dependencies`

`base_order_id`, `dependent_order_id`, `dependency_type`, `status`, `created_at`, `resolved_at`, and `resolution`. This makes downstream credit impact explicit when an earlier payment is fully or partially refunded.

## Retained operational domains

- Identity/profile, orders, projects, delivery fields, and customer refund requests.
- Stripe event processing and payment-to-account linking.
- Contact rate limits and server-only submission RPC.
- Findings, evidence, snapshots, approvals, retests, and report artifacts.
- Prospects, public-contact provenance, private previews, suppression, outreach settings, queue, opt-outs, and append-only audit history.
- Marketing creative masters/variations and human approval records.

Existing columns are not silently renamed or reinterpreted. If a later model replaces a legacy concept, the migration includes explicit backfill, compatibility window, validation query, rollback/forward-recovery strategy, and ADR when meaning changes.

## RPC and grant contract

The reservation RPC authenticates the current user, locks the entitlement row, calculates nonrefunded settled value, expires conflicts, validates target/rank, creates one reservation, and returns only safe checkout inputs. Payment reconciliation uses service-only access and atomic updates. Security-definer functions have an explicit owner, fixed safe `search_path`, schema-qualified references, revoked `public`/`anon`/`authenticated` execution unless intentionally granted, and tests for direct browser denial.

Audit events for payments, entitlement transitions, refunds, preview approval/revocation, suppression, and outreach transitions are append-only for ordinary roles. Foreign keys and common lookup/filter paths receive indexes and performance-advisor review.

## Privacy and retention

Collect only fields required for delivery, evidence, consent, suppression, legal records, and reconciliation. Raw private-preview tokens are never stored; only hashes and expiry/revocation state persist. Logs and exports exclude secrets and minimize personal/free-form data. Deletion and retention actions preserve payment, suppression, and audit records where legitimately required while removing nonessential content.

## Delivery states

### IMPLEMENTED

Existing migrations establish RLS-protected customer and operational tables, confirmed-email linking, payment events, passive review records, preview hashing/expiry, suppression, outreach ceilings, creative tracking, and refund requests.

### PLANNED

Forward migrations add the four catalog/entitlement tables, constraints, indexes, safe projection, reservation/reconciliation RPCs, refund dependency logic, grants, and contract tests before any caller depends on them.

### EXTERNALLY BLOCKED

The remote Supabase project identity, applied migration history, Auth configuration, advisors, seed/catalog state, and nonproduction RPC behavior have not been verified from this worktree.

### LAUNCH-ONLY

Production database backup, migration apply, maintenance window if needed, advisor signoff, secret rotation, monitoring, recovery rehearsal, and production rollback decision require explicit approval.

## Validation

Run SQL syntax/migration tests, clean-database and upgrade-path applies, constraint fixtures, RLS allow/deny matrix, direct RPC denial, transaction/race tests, index/advisor review, refund-ordering tests, and rollback/forward-recovery rehearsal. Record migration filenames and checksums in final evidence.
