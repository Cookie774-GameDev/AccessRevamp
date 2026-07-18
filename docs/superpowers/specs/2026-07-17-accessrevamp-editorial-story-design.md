# AccessRevamp Editorial Story Redesign

**Status:** Approved design direction  
**Date:** 2026-07-17  
**Branch:** `redesign/editorial-story-ultramarine`

## Goal

Rebuild AccessRevamp as a distinctive, light editorial studio website that makes the design work visible early, explains the service through a clear three-step story, and preserves every existing Stripe, Supabase, Netlify, and customer-workspace contract.

## Approved direction

The public experience uses an **Editorial Story** structure:

1. **Find the friction** — human-reviewed public-surface accessibility, usability, and technical observations.
2. **Clarify the offer** — show the visual hierarchy, trust, calls to action, and selected original concept work.
3. **Build the stronger version** — explain the bounded services, implementation, retest, delivery, and practical growth guidance.

The site remains a portfolio first, a service narrative second, and a checkout funnel third. Original work stays clearly labelled as fictional concept work. Google Drive remains an internal operator workspace and is never exposed as a browser data source.

## Visual system: Ultramarine + Sun

The original warm direction is retained, but the restrained clay-only palette is replaced with a more expressive studio system:

```css
:root {
  color-scheme: light;

  --canvas: #f6f2df;
  --canvas-deep: #eee6c9;
  --surface: #fffdf5;
  --surface-soft: #e7ecff;

  --ink: #17243b;
  --ink-soft: #4f5968;
  --ink-faint: #6f7784;

  --ultramarine: #3c56d9;
  --ultramarine-hover: #2f46bc;
  --ultramarine-soft: #dce2ff;

  --sun: #ffbe3d;
  --sun-soft: #ffe7a8;
  --persimmon: #f7603a;
  --persimmon-soft: #ffd8cf;
  --sky: #b9dcf7;

  --line: rgba(23, 36, 59, 0.14);
  --line-strong: rgba(23, 36, 59, 0.24);
  --glass: rgba(255, 253, 245, 0.72);
  --glass-strong: rgba(255, 253, 245, 0.9);

  --danger: #9d302c;
  --warning: #755317;
  --success: #245d4a;
}
```

Ultramarine is the primary interactive color. Sun, persimmon, and sky are large-area accents, portfolio fields, illustration colors, and status-support colors rather than default body text. All final foreground/background combinations and interactive states must pass WCAG 2.2 AA contrast checks.

The typography keeps a high-contrast editorial serif for display roles and a precise sans-serif for body, UI, and data. The implementation uses only system fallbacks until a properly licensed self-hosted font is intentionally added.

## Brand mark and motion

Create an original AR ligature as an inline SVG: two architectural strokes form the A, and the right stroke continues into the R. It has a static accessible version and a one-time 600–900 ms stroke reveal on the homepage only. The isolated cinematic route retains its dark visual language and a meaningful reduced-motion fallback.

Motion is limited to hierarchy: short reveals, a small header compression, low-amplitude image parallax on fine-pointer desktop devices, and the existing route-scoped cinematic demo. Native scrolling, keyboard navigation, and reduced-motion behavior are non-negotiable.

## Public information architecture

The global navigation is **Work, Services, Process, Pricing, Contact**, with Sign in as a secondary action and Start a revamp as the primary CTA. Direct routes and metadata are preserved for:

- `/`, `/portfolio`, `/pricing`, `/sample-report`, `/methodology`, `/outreach-standards`, `/contact`
- `/login`, `/signup`, `/dashboard`, `/cinematic-scroll`
- `/legal`, `/refunds`, `/privacy`, `/terms`, `/accessibility`, `/success`, `/cancel`
- Netlify's private preview route

The homepage sequence is:

1. Lightweight sticky header and editorial hero: “Your website should feel as considered as your business.”
2. Selected Work immediately after the hero, using large original-concept compositions and visible disclosure.
3. The three-step Editorial Story, connecting review evidence, design direction, and delivery.
4. Three exact service offerings with scope boundaries next to each promise.
5. A sample-report section with evidence, confidence, recommendation, and concept response.
6. Process, creative breadth, FAQ/boundary reassurance, and contact CTA.
7. Footer with legal and accessibility paths.

## Content and service truth

The central plan data model supplies all pricing displays, checkout actions, dashboard plan names, and order labels.

- **Homepage Reveal — $50 one time:** reviewed homepage report and complete first-screen direction; no implementation.
- **Quick Fix Plan — $199 one time:** complete agreed revamp, findings, practical guidance, and ten Canva-ready campaign variations; no false $200 rounding.
- **Cinematic Scroll Site — $250 one time:** one bounded responsive scroll-directed microsite with up to four story beats.

There are no subscriptions, recurring platform fees, fabricated outcomes, fabricated clients, security guarantees, accessibility certifications, or revenue claims. Stripe stays in sandbox mode until the business and production-launch prerequisites are separately completed.

## Application architecture

Replace the current post-render mutation model with one entry point, one router, explicit page modules, reusable shell/components, central route metadata, central plans, central portfolio data, delegated/rebound events, and route cleanup for the cinematic effect. No application-level `MutationObserver` remains.

The refactor preserves:

- server-created Stripe Checkout Sessions and strict destination validation
- exact Stripe Price ID, amount, currency, quantity, metadata, idempotency, and webhook reconciliation
- Supabase Auth with the browser publishable key only
- RLS-protected own-project, own-order, own-creative, and pre-delivery refund-request reads
- the server-only contact rate-limit flow
- private preview noindex/no-store behavior
- restrictive Netlify CSP and local assets only

## Customer experience states

Contact retains its existing strict payload and handles empty, invalid, submitting, success, rate-limited, and backend-unavailable states. Checkout handles ready, opening, failed server creation, safe Stripe fallback, canceled, successful, and sandbox states. Authentication and dashboard handle configuration-missing, loading, signed out, confirmation required, session expired, empty, populated, partial backend failure, refund eligibility, and delivered/refund-closed states.

## Verification

The implementation must add regression coverage for routing, plan configuration, checkout actions, contact payloads, dashboard mapping, cinematic cleanup, and reduced-motion behavior. Before handoff, run the repository quality gate, audit production dependencies, test direct-route navigation and browser history, inspect desktop and mobile widths, and verify that no secrets appear in built assets. Stripe/Supabase live-operation verification remains explicitly separate from code-only verification.

## Non-goals

This rebuild does not activate live Stripe payments, publish a production site, expose Google Drive in the browser, weaken CSP, change Supabase authorization scope, create a public policy for intentionally server-only tables, or introduce a framework migration.
