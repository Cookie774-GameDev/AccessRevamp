# Deployment and rollback runbook

**Status:** `IMPLEMENTED` local build configuration, `PLANNED` nonproduction preview and rehearsal, `EXTERNALLY BLOCKED` connected-environment evidence, and `LAUNCH-ONLY` production activation. No production switch has been authorized.

**Owner:** Release engineering with database, payments, security, operations, product, and legal owners.

**Authority:** [approved rebuild specification](superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md) and the [cinematic/quality/deployment plan](superpowers/plans/2026-07-18-accessrevamp-cinematic-quality-deployment.md).

## Environments

Local development uses no production secrets. Preview/staging must be an owned Netlify context, a confirmed nonproduction Supabase project, and Stripe test mode. Production is a separately approved environment with its own restricted secrets, domain, monitoring, legal identity, backup, and runbook.

Never apply a migration until the CLI/connector clearly identifies the dedicated target project. Never infer remote state from migration files. Never bind live Stripe keys or prices to preview. Never place a service-role key, Stripe secret, webhook secret, preview token, sender credential, or Google Drive credential in browser variables or Git.

## Local preflight

1. Confirm the linked worktree and expected feature branch.
2. Run `npm ci` with Node 22.12 or newer.
3. Run `npm run check` and `npm audit --omit=dev --audit-level=high`.
4. Verify catalog, entitlement arithmetic, migrations, RLS, payment matrix, route inventory, demos, accessibility, browser matrix, performance budgets, secret scan, and documentation links.
5. Confirm `sending_enabled=false`, Stripe expected mode is test, and no production identifier is present.
6. Build `dist` and inspect bundle/source maps and headers configuration.

## Nonproduction sequence

1. Confirm and back up the nonproduction Supabase project; record migration history.
2. Apply forward migrations in filename order and run schema, constraint, grant, RLS, RPC, race, and advisor checks.
3. Synchronize only the Stripe test catalog through the guarded script; retain product/price/mode evidence without recording secrets.
4. Configure Netlify preview environment categories and deploy the feature branch.
5. Register a test webhook for the preview endpoint and run the complete test-mode payment/refund matrix.
6. Run browser, accessibility, performance, privacy, header, log, account, operator, preview, and demo checks.
7. If explicitly authorized, run conservative load/security checks only against this owned preview.
8. Reconcile all evidence and rehearse rollback/forward recovery before requesting launch approval.

## Rollback and forward recovery

Static rollback selects the last known-good immutable deployment. Environment rollback restores the prior reviewed variable set without exposing values. Database migrations are forward-only by default: restore or corrective migration decisions depend on backup age, data written since change, compatibility window, and tested recovery steps. Destructive down migrations are not assumed safe.

Stripe rollback disables the new server mapping/checkout path and expires open reservations; it does not delete settled payment records or blindly delete products used by existing sessions. Webhook processing remains idempotent through version transitions. Outreach rollback keeps sending disabled, revokes previews if required, and preserves suppression/audit history.

Rollback triggers include cross-user access, wrong amount/credit, payment reconciliation drift, unavailable primary journeys, critical security/header regression, data loss/corruption, inaccessible checkout/account flows, or monitoring blind spots. The release owner records decision time, scope, action, validation, and follow-up.

## Delivery states

### IMPLEMENTED

Vite build output, Netlify function/SPA configuration, security headers, local preview command, health function, migration directory, CI foundation, and local verification gate are present.

### PLANNED

Confirmed nonproduction migration apply, guarded Stripe test catalog sync, preview deployment, E2E webhook matrix, cross-browser/accessibility/performance evidence, monitoring checks, and rollback rehearsal are required by the approved plans.

### EXTERNALLY BLOCKED

No Netlify preview URL, confirmed remote Supabase project state, Stripe test catalog result, owned active-test authorization, DNS state, or remote monitoring evidence has yet been proven for this branch.

### LAUNCH-ONLY

Production migration, domain publication/replacement, live Stripe catalog and keys, production webhook, tax settings, real transaction, sender/outreach enablement, and production active testing require a new explicit approval. This documentation does not grant it.

## Launch gate

Production approval requires environment ownership, secret readiness/rotation, backup and recovery, migration/advisor signoff, complete payment evidence, accessibility and legal review, privacy/analytics review, monitoring and incident contacts, final content/identity, rollback rehearsal, known-limitations acceptance, and a requirement-by-requirement handoff. After approval, smoke-test primary routes and a controlled live payment according to the separate launch plan; otherwise stop at preview.
