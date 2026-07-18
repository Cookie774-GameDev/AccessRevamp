# Product operating model

**Status:** Mixed — `IMPLEMENTED` foundations, `PLANNED` rebuild work, `EXTERNALLY BLOCKED` remote verification, and separately approved `LAUNCH-ONLY` actions.

**Owner:** Product owner with engineering, design, operations, and payment owners accountable for their named subsystems.

**Authority:** [approved rebuild specification](superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md) and the [foundation/catalog plan](superpowers/plans/2026-07-18-accessrevamp-foundation-catalog.md).

## Product promise

AccessRevamp helps an independent business see where its public website creates friction, understand a specific evidence-backed improvement, and choose a clearly bounded one-time service. It is a portfolio first, a service narrative second, and a checkout funnel third. It never presents automated output as a completed audit or fictional work as client work.

Primary audiences are small-business owners evaluating the studio, existing customers checking delivery and upgrade status, and authorized operators reviewing evidence, payments, previews, and outreach. The website must be useful without motion, authentication, analytics consent, maps, weather, remote media, or configured payment secrets.

## Canonical catalog

| Rank | Tier | List price | Commercial boundary |
| ---: | --- | ---: | --- |
| 0 | Free Snapshot | $0 | One manually reviewed public observation; no checkout or full audit. |
| 1 | Homepage Reveal | $50 one time | Human-reviewed report, one landing-page direction, desktop/mobile PNGs, implementation priorities, and a 30-day growth plan. |
| 2 | Complete Website Revamp | $200 one time | Applicable Homepage Reveal work plus an agreed responsive implementation of up to five standard content pages and a retest summary. |
| 3 | Cinematic Scroll Site | $250 one time | Complete Website Revamp scope plus one bounded cinematic single-page narrative with mobile and reduced-motion fallbacks. |

Entitlements are cumulative. A verified $50 entitlement pays $150 toward Complete Website Revamp or $200 toward Cinematic Scroll Site. A verified $200 entitlement pays $50 toward Cinematic Scroll Site. The staged path `$50 + $150 + $50` totals $250. Anonymous visitors see list prices; only the server may calculate or grant credit.

Every paid tier is one-time. There is no AccessRevamp subscription, platform surcharge, guarantee of compliance or revenue, unlimited revision promise, or browser-selected discount. Scope, inputs, exclusions, delivery date, taxes where legally required, and refund boundary are disclosed before payment.

## Experience contract

- Public routes explain the story, process, services, methodology, pricing, sample report, policies, accessibility approach, outreach standards, contact path, and original working demonstrations.
- The homepage moves from evidence-led problem recognition to proof, process, catalog, boundaries, and one clear next action.
- The free snapshot collects only the minimum information needed for manual review and consented follow-up.
- Portfolio concepts use the exact disclosure: “Original working demo — not a client engagement.”
- Customer account views distinguish list price, verified credit, due now, entitlement, payment state, project state, deliverables, and refund-request state.
- Operator views distinguish candidate evidence from verified findings and customer refund requests from completed refunds.

## Product invariants

- Stripe Price IDs and service credentials remain server-only.
- Paid credit requires an authenticated, confirmed user and settled, nonrefunded value.
- Google Drive is internal operator context only; it is not a public content source.
- Outreach sending remains disabled and no message is sent by this rebuild.
- Active testing is limited to owned, explicitly authorized nonproduction systems.
- Analytics exclude free-form copy, identities, access notes, prospect research, payment data, and preview tokens.
- Missing remote evidence remains incomplete; source code is not proof of a deployed integration.

## Delivery states

### IMPLEMENTED

The retained Vite/Netlify/Supabase/Stripe foundation, passive scanner boundaries, current authentication and customer workspace, human review structures, baseline evidence, and this documentation contract exist locally. The pre-rebuild baseline is recorded in `docs/baseline/2026-07-18.md`.

### PLANNED

The exact typed catalog, cumulative entitlements, protected upgrade checkout, reconciled refunds, rebuilt public routes, account/operator experiences, three route-isolated demos, cinematic story, reports, analytics contract, and final quality evidence are implemented through the six approved plans.

### EXTERNALLY BLOCKED

Remote Supabase schema state, Stripe test catalog creation, a Netlify preview URL, owned staging authorization, and end-to-end external integration evidence require confirmed connected environments. They are not inferred.

### LAUNCH-ONLY

Production-domain publication, live Stripe activation, production migration application, outreach enablement, sender identity, legal signoff, secret rotation, monitoring, and rollback signoff require separate explicit approval.

## Validation

Run `npm run check`, `npm audit --omit=dev --audit-level=high`, catalog contract tests, the payment matrix, cross-browser journeys, accessibility checks, and the final requirement audit. Product copy must be searched for legacy catalog price/name language, subscription language, client-work implications, and unsupported claims before launch approval.
