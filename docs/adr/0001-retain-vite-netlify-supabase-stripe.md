# ADR 0001: Retain Vite, Netlify Functions, Supabase, and Stripe

**Status:** Accepted

**Date:** 2026-07-18

## Context

The repository already has a modular Vite application, Netlify Functions, Supabase migrations/RLS, Stripe test checkout, Node contract tests, and a passing production build. The production rebuild adds cumulative entitlements, protected upgrades, operator/customer surfaces, three route-isolated demonstrations, reporting, and much deeper verification.

A framework migration would add routing, rendering, deployment, authentication, bundle, and security change risk without being required for the approved product behavior. Separate deployable demo applications would duplicate shell, accessibility, analytics, policy, and build infrastructure.

## Decision

Retain:

- Vite and native ES modules for the single deployable web application;
- Netlify Functions for same-origin trusted server boundaries;
- Supabase Auth/Postgres/RLS for identity and authoritative operational data;
- Stripe Checkout and signed webhooks in test mode for payments;
- route-isolated Greenline, Firejar, and Clearflow modules within the Vite app;
- forward-only database migrations; and
- a server-authoritative catalog adapter with no browser Price IDs.

No component framework, CMS, WebGL dependency, framework migration, live Stripe switch, production database change, or production deployment is approved by this ADR.

## Consequences

The team extends known patterns and can compare new work against the existing baseline. Demo routes share accessibility and analytics primitives but own their state and styles. Netlify bundle boundaries must be tested when server code imports the pure catalog module. Dynamic route imports keep demo/cinematic code out of unrelated initial routes.

The current JavaScript repository uses JSDoc typedefs and behavioral contract tests instead of a broad TypeScript migration. A future TypeScript or framework proposal needs a separate ADR with measured benefit, migration/rollback plan, bundle impact, security review, and explicit approval.

## Rejected alternatives

1. **Migrate to Next.js or another application framework.** Rejected because it changes deployment/render/auth assumptions without solving an approved requirement.
2. **Build three separate demo applications.** Rejected because it creates duplicate build/deploy/testing surfaces and makes shared safety fixes harder.
3. **Put Stripe Price IDs in browser configuration.** Rejected because the browser cannot be trusted to select money or credit.
4. **Use WebGL for the cinematic route.** Rejected as unnecessary for the four-beat story and risky for accessibility, battery use, failure modes, and bundle budgets.

## Validation

This decision remains valid while the single Vite build meets route isolation, accessibility, performance, and cleanup budgets. Revisit only with direct evidence that an approved requirement cannot be met safely within these boundaries.

