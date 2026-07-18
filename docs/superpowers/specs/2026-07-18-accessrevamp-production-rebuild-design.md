# AccessRevamp Production Rebuild Design

**Status:** Architecture approved; specification awaiting user review
**Date:** 2026-07-18
**Branch:** `redesign/editorial-story-ultramarine-local`
**Authoritative brief:** `C:\Users\viper\Downloads\Your prompt.txt`

## 1. Purpose

AccessRevamp will be a production-ready, evidence-led website improvement service. It will help a small-business owner understand what is making a public website harder to use, review a private proposed improvement, buy a clearly bounded one-time service, and track delivery without fabricated claims or unsafe automation.

The rebuild is one coherent platform with six deliberately separated operating surfaces:

1. a public marketing and education website;
2. three complete, original portfolio demonstration sites;
3. an authenticated customer account;
4. an authenticated operator workspace;
5. a token-protected private-preview and human-reviewed outreach workflow; and
6. server-authoritative payments, entitlements, refunds, and audit records.

The current Vite, Netlify Functions, Supabase, and Stripe architecture remains in place. The rebuild will remove stale two-plan assumptions and extend the current modular source rather than migrate frameworks.

## 2. Success definition

The work is successful only when the repository and verified runtime prove every requirement in the authoritative brief. A polished homepage alone is not completion.

Completion requires:

- every named route and state works without dead controls;
- the three demonstrations are responsive, functional mini-apps with exact honesty labels;
- one typed catalog supplies public pricing, server checkout selection, webhook reconciliation, account upgrades, tests, refund logic, and generated documentation;
- Supabase migrations establish cumulative entitlements before upgrade checkout is enabled;
- Stripe remains in test mode and price selection remains server-only;
- customer, operator, preview, and outreach authorization boundaries are enforced on the server and in RLS;
- outreach sending remains disabled until an explicit readiness approval outside this rebuild;
- generated assets have provenance and licensed output formats;
- the complete browser, accessibility, performance, security, payment, and recovery matrix is verified with retained evidence; and
- deployment, rollback, third-party, and operational documentation reflects what has actually been tested.

## 3. Product truth and safety invariants

These rules are part of the system design, not optional copy guidance:

- Never invent customers, clients, business owners, emails, results, vulnerabilities, revenue, conversion lifts, compliance status, research sources, screenshots, test results, or deployment status.
- Every portfolio demonstration must visibly include the exact sentence: **“Original working demo — not a client engagement.”**
- Demonstration reviews, credentials, trust signals, nutrition information, prices, ETAs, stock, maps, and service areas must be marked as sample or fictional where applicable.
- Public-site review is passive and limited to public surfaces. No active testing of a prospect is allowed without exact written authorization.
- Outreach must follow: **Research → Evidence → Human review → Private preview → Human approval → Suppression check → Queue → Send.**
- `sending_enabled` defaults to `false`. No implementation or deployment in this project may silently enable it.
- A suppression hit, opt-out, hard bounce, complaint, negative response, or exhausted lawful follow-up permanently stops the relevant send path.
- Stripe Price IDs, Supabase service credentials, webhook secrets, signing secrets, and private tokens never enter browser bundles, `VITE_*` variables, logs, screenshots, prompts, prospect records, Google Sheets, or public assets.
- No subscription or recurring fee is offered.
- The product remains useful with reduced motion, delayed JavaScript, keyboard-only operation, assistive technology, 200% zoom, 320-pixel reflow, slow mobile networks, and failed media.

## 4. Approved architecture

### 4.1 Application shape

Use the existing Vite application as the deployable unit. Each portfolio demo is a route-isolated mini-app within that application rather than a separate build or a framework migration.

The source will be divided by responsibility:

- `src/app/`: router, lifecycle, metadata, authentication hydration, error boundaries;
- `src/config/`: typed public catalog, route contracts, safe runtime configuration;
- `src/components/`: reusable accessible primitives and the public shell;
- `src/pages/`: public, customer, operator, policy, and portfolio index pages;
- `src/demos/greenline/`, `src/demos/firejar/`, `src/demos/clearflow/`: independent demo state, components, validation, structured data, and styles;
- `src/services/`: same-origin API clients, analytics allowlist, auth-aware request helpers;
- `netlify/functions/`: trusted validation and orchestration boundaries;
- `netlify/functions/_shared/`: server catalog, Supabase service client, Stripe client, schema validation, audit helpers, origin checks, and safe error handling;
- `supabase/migrations/`: forward-only schema, RLS, functions, grants, and audit constraints;
- `tests/`: contract, unit, integration, browser, accessibility, and policy checks;
- `docs/`: product, architecture, design, payments, data model, security, outreach, quality, deployment, and third-party records.

Demo-specific CSS and JavaScript must load only on the matching route. Route lifecycle cleanup must remove observers, media handlers, animation frames, timers, and document-level listeners when navigation occurs.

### 4.2 Decision records

Create an ADR before any framework migration, component framework, CMS, WebGL dependency, irreversible data change, Stripe mode change, Supabase project change, or Netlify production switch. The approved default is no framework migration, no heavy component framework, no WebGL requirement, forward-only reversible migrations, test-mode Stripe, and preview/staging deployment.

### 4.3 Client/server authority

The browser may request an action and display a result, but it does not decide money, access, authorization, delivery state, suppression, or eligibility.

- The browser sends only a confirmed target tier and a cryptographically random request ID for checkout.
- The authenticated user identity comes from a verified server-side Supabase token, not an email field.
- The server catalog selects the exact Stripe test Price ID after entitlement locking and calculation.
- Webhooks are the authority for settled payment state.
- RLS and server-side authorization are the authority for data visibility.
- The operator UI is never treated as an authorization control by itself.

## 5. Visual and interaction design

### 5.1 Direction

The approved direction is **Editorial diagnostic lab meets cinematic creative studio**. The experience should feel authored, observant, warm, and technically precise—not like a generic SaaS template or a stale monochrome dashboard.

The page tells one story:

**scattered signals → verified evidence → redesigned hierarchy → clear action**

### 5.2 Color tokens

The required palette is:

```css
:root {
  --ink: #0b1020;
  --near-black: #05070c;
  --bone: #f6f1e8;
  --white: #ffffff;
  --signal-coral: #ff5a3d;
  --mint: #a7f3d0;
  --electric-yellow: #f7d154;
  --slate: #6b7280;
}
```

Bone is the primary editorial canvas. Ink and near-black create diagnostic panels and strong type. Coral is the primary signal and action color, mint marks verified or constructive evidence, and electric yellow is reserved for rare highlights. Slate may not be used where it fails contrast. All interactive and textual combinations must meet WCAG 2.2 AA.

### 5.3 Typography and composition

- Use a high-character editorial display face only if it is licensed and self-hosted; otherwise use a carefully tuned serif system stack.
- Use a precise, readable sans-serif system stack for body, forms, tables, and diagnostic labels.
- Large headlines may be asymmetric but cannot create horizontal overflow or hide content at 320 pixels or 200% zoom.
- Long pages use visible section numbers, marginal notes, evidence markers, ruled dividers, and generous negative space.
- Data, pricing, forms, and policy text prioritize comprehension over visual novelty.
- Focus, hover, active, disabled, loading, success, warning, and error states are designed as first-class states.

### 5.4 Motion and media

- Motion communicates progress from signal to evidence to redesign; it never gates information.
- The cinematic sequence uses native scroll with progressive enhancement and route-scoped cleanup.
- Reduced-motion users receive complete static panels with the same story and actions.
- Autoplay video, if used, must be silent, pausable, poster-backed, and nonessential.
- Media failure leaves readable content, dimensions, accessible alternatives, and a usable CTA.
- Generated raster assets live in `public/assets/generated/` with AVIF, WebP, and PNG variants plus `manifest.json` recording purpose, prompt summary, generation date, tool, dimensions, and any manual edits.
- Generated visuals must be original and may not depict fake customers, testimonials, or real unlicensed businesses.

## 6. Information architecture

The route contract is:

### Public marketing and education

- `/`
- `/process`
- `/pricing`
- `/portfolio`
- `/free-snapshot`
- `/sample-report`
- `/methodology`
- `/outreach-standards`
- `/contact`

### Portfolio demonstrations

- `/portfolio/greenline-lawn-and-grounds`
- `/portfolio/firejar-spicy-peanut-butter`
- `/portfolio/clearflow-plumbing`

### Authentication and customer account

- `/login`
- `/signup`
- `/account/projects`
- `/success`
- `/cancel`

### Policies and accessibility

- `/refunds`
- `/privacy`
- `/terms`
- `/accessibility`

### Private review

- `/preview/:token`

Legacy URLs may redirect to their new equivalents only where semantics are preserved. Direct entry, refresh, browser history, metadata, noindex rules, and error handling must work for every route.

## 7. Public experience

### 7.1 Homepage

The homepage contains these modules in a coherent editorial sequence:

1. a light, accessible global header;
2. a diagnostic-lens hero using **“Your website is already telling us where customers get stuck.”** with primary CTA **“Get the $50 Homepage Reveal”** and secondary CTA **“See a verified example.”**;
3. a plain-language trust strip explaining human review, public evidence, one-time pricing, and no invented outcomes;
4. a diagnostic spectrum showing accessibility, usability, mobile behavior, performance, content, SEO/local discovery, conversion, monetization, analytics, social growth, and security hygiene without unsupported scores;
5. a before/evidence/after composition with source, observation, confidence, impact, and design response;
6. the process: Scout → Verify → Preview → Approve → Build → Measure;
7. the three original working demonstrations;
8. a free finding invitation;
9. the complete tier and cumulative-upgrade model;
10. clear deliverables and exclusions for every tier;
11. the ethical review and outreach boundary;
12. a preview of the 30-day social/growth deliverable;
13. a factual FAQ; and
14. a closing CTA plus full legal, accessibility, contact, and authentication footer.

Claims must remain verifiable. Example observations must show their source and example status. No rotating fake metrics, fake logo strips, manufactured urgency, or fabricated social proof may appear.

### 7.2 Process and methodology

`/process` explains the customer journey and ownership handoffs. `/methodology` explains what is observed, the difference between passive public review and authorized testing, how confidence is expressed, how accessibility limitations are stated, and how human review prevents automated false positives.

### 7.3 Free snapshot and sample report

The free snapshot captures only the data required for a manually reviewed, evidence-backed observation and consented follow-up. It includes validation, rate limiting, privacy context, success/error/duplicate states, and no promise of instant automated diagnosis.

The sample report uses clearly fictional or owned sample material and demonstrates evidence, confidence, impact, prioritization, recommendation, responsive concept, accessibility notes, implementation boundary, and growth plan without implying a real client engagement.

## 8. Service catalog and cumulative entitlements

One typed catalog is the canonical product definition. A safe generated public projection may expose names, list prices, public descriptions, and deliverables. Stripe Price IDs and server rules remain in a server-only projection. A contract test must fail if the projections disagree on tier keys, amount, currency, or upgrade matrix.

### Tier 0 — Free Snapshot — $0

- one manually reviewed, evidence-backed public observation;
- no full audit, redesign, implementation, active testing, or guaranteed response time.

### Tier 1 — Homepage Reveal — $50 one time

- a human-reviewed report covering accessibility, usability, mobile behavior, performance, SEO/local discovery, copy/hierarchy, conversion, monetization ideas, customer-acquisition opportunities, analytics recommendations, social platform/content/cadence/experiment planning, and passive or authorized security hygiene;
- one redesigned landing page with one primary conversion goal and client-supplied factual content/assets;
- desktop and mobile PNG exports;
- a 30-day social/growth plan;
- one consolidated concept revision and a prioritized implementation plan;
- explicit statement of whether the deliverable is coded, conceptual, or both;
- no custom backend, ecommerce migration, account system, custom 3D, paid media, ongoing hosting, revenue guarantee, or compliance guarantee; and
- no recurring fee.

### Tier 2 — Complete Website Revamp — $200 one time

- includes the applicable Homepage Reveal work;
- agreed implementation of up to five standard content pages, unless written scope says otherwise;
- responsive build, in-scope accessibility/usability work, performance cleanup, local SEO/structured data, and consent/access-dependent analytics events;
- one retest summary, before/after evidence, consolidated revision, written exclusions, and confirmed delivery date;
- a verified $50 entitlement receives $50 credit and pays $150;
- scope beyond five pages requires a separate approved agreement.

### Tier 3 — Cinematic Scroll Site — $250 one time

- includes the Complete Website Revamp scope plus one cinematic single-page narrative, one scroll-scrubbed video/image sequence/generated motion system, up to four story beats, one primary conversion action, optimized media/posters, mobile and reduced-motion fallbacks, one consolidated revision, and deployment-ready source within written scope;
- no prior entitlement pays $250;
- a verified $50 entitlement pays $200;
- a verified $200 entitlement pays $50;
- the staged path `$50 + $150 + $50` totals $250.

Pricing UI always displays list price, server-verified credit, due now, resulting entitlement, one-time status, scope boundary, and refund link. Anonymous visitors see list prices and must authenticate before entitlement credit is calculated. Browser storage, query strings, typed email, or client-calculated totals never grant credit.

## 9. Supabase data design

### 9.1 Catalog and entitlements

Forward migrations add:

- `tier_catalog`: `tier_key`, `rank`, `list_price_cents`, `active`, server-only `stripe_full_price_id`, `created_at`, and `updated_at`;
- `entitlements`: `id`, `user_id`, `highest_tier_key`, `status` (`active`, `suspended`, or `revoked`), `source_order_id`, `effective_paid_cents`, timestamps, and a unique active entitlement per user;
- `upgrade_reservations`: `id`, `user_id`, `from_tier_key`, `to_tier_key`, `gross_cents`, `credit_cents`, `net_cents`, server-only `stripe_price_id`, status (`reserved`, `checkout_created`, `paid`, `expired`, `canceled`, or `reversed`), `expires_at`, `idempotency_key`, `checkout_session_id`, `source_entitlement_id`, and timestamps;
- `refund_dependencies`: `base_order_id`, `dependent_order_id`, `dependency_type`, `status`, `created_at`, `resolved_at`, and `resolution`.

Exact columns, unique constraints, foreign keys, check constraints, indexes, grants, and functions will be detailed in `DATA_MODEL.md` and the implementation plan before migration code is written.

Entitlement computation is cumulative monetary value capped at the highest settled tier, not a browser-set plan string. A transaction or security-definer RPC locks the entitlement row, expires conflicting reservations, computes nonrefunded settled value, validates the target tier, creates one reservation for the exact difference, and returns only the server-approved checkout data.

### 9.2 Existing operational data

Existing profiles, orders, projects, Stripe events, contact limits, findings, prospects, previews, outreach settings, suppression, queue, audit, evidence, creative, and refund data are preserved through forward migrations. Destructive renames or semantic reinterpretations require an ADR and a tested backfill/rollback strategy.

### 9.3 RLS and functions

- Customers may read only their own appropriate profile, orders, entitlements, projects, deliverables, and refund requests.
- Internal research, evidence, previews, suppression, queue, Stripe events, reservations, refund dependencies, and operational audit data are service/operator-only unless a narrowly scoped customer projection is explicitly defined.
- Every exposed table has RLS enabled and least-privilege policies.
- Security-definer functions use a fixed safe `search_path`, explicit ownership, least privilege, and revoked public execution.
- Audit records for payment, entitlement, preview approval, suppression, and outreach transitions are append-only to ordinary application roles.

## 10. Stripe checkout, webhooks, and refunds

### 10.1 Test-mode price catalog

The server-only environment maps exact one-time test prices for:

- full purchases: Homepage Reveal $50, Complete Website Revamp $200, and Cinematic Scroll Site $250;
- upgrades: $150, $200, $50.

The stale $199 Quick Fix product is replaced by **Complete Website Revamp — $200** in test-mode configuration and code. No live Stripe mutation is authorized by this design approval.

### 10.2 Checkout creation

The same-origin function must:

1. enforce method, origin, content type, body size, and strict schema;
2. validate the authenticated, confirmed Supabase user;
3. accept only `targetTier` and a random `requestId`;
4. lock or atomically compute the current entitlement;
5. select the exact server-only full or upgrade Price ID;
6. create a 30-minute reservation;
7. create one 30-minute Stripe Checkout Session with the exact server-selected Price ID, one line item, verified customer identity, required billing address, no client-selected promotion code, exact success/cancel destinations, and idempotency;
8. attach the required nine-field metadata contract: `user_id`, `reservation_id`, `from_tier`, `to_tier`, `gross_cents`, `credit_cents`, `net_cents`, `source_entitlement_id`, and `checkout_request_id`; and
9. return a safe Stripe-hosted checkout URL.

Repeated requests with the same user, target tier, and request ID must not create duplicate payable sessions. Expired or conflicting reservations return a recoverable state.

### 10.3 Webhook reconciliation

The webhook verifies the raw body and signature, deduplicates event IDs, retrieves the Checkout Session when required, and verifies mode, payment status, currency, amount, line-item Price ID, metadata, user, reservation, and target tier against server records.

In one atomic reconciliation path it updates the Stripe event record, order, reservation, entitlement, customer project, and audit event. It handles checkout completion, asynchronous success, asynchronous failure, session expiry, full refund, partial refund, and duplicate/out-of-order delivery.

### 10.4 Refund dependencies

A refund cannot silently leave downstream upgrades over-credited. Full or partial refund processing records the Stripe refund ID, amount, reason, operator, and timestamps; records dependencies; recomputes settled value; identifies affected later purchases; and routes ambiguous cases to operator review. An unsupported entitlement is suspended or flagged according to disclosed terms while the balance or other resolution is determined. Duplicate refund events are idempotent. Customer-facing language distinguishes a request from an approved or completed refund and preserves statutory rights.

### 10.5 Required payment matrix

Automated and test-mode integration coverage must include:

- new $50, $200, and $250 purchases;
- $50 → $200 for $150, $50 → $250 for $200, $200 → $250 for $50, and the $50 → $200 → $250 path totaling $250;
- repeated checkout click, reused request ID, and two concurrent upgrade tabs;
- tampered target tier or metadata, wrong Stripe Price, amount, or currency;
- checkout expiration, asynchronous failure, and asynchronous success;
- webhook replay, a recorded event whose first processing attempt fails, and successful retry;
- base refund before an upgrade and base refund after a dependent upgrade;
- unconfirmed email and a different authenticated user sharing the typed email;
- sandbox/live mismatch; and
- full, partial, and duplicate refund events.

## 11. Customer account

`/account/projects` is authentication-gated and handles configuration missing, loading, signed out, email confirmation required, session expired, empty, populated, partial failure, and unavailable states.

It shows:

- current highest settled entitlement and total verified credit;
- next eligible tier, list price, verified credit, and due-now quote from the server;
- order history with truthful settlement/refund states;
- projects, intake status, required inputs, delivery due date, milestones/stage, agreed scope, report/concept/PNG/creative links, previews, accessible downloads, and consolidated revision request;
- refund eligibility and request status without promising approval;
- safe account/session controls.

The account never derives authority from order labels, local storage, or UI-hidden controls.

## 12. Operator workspace

The operator surface requires an authenticated allowlisted operator claim checked on the server. It provides bounded views for:

- prospects, sources, consent/contact basis, evidence, score, and review state;
- findings, confidence, screenshots/evidence references, and human verification;
- private preview creation, expiry, approval, revocation, and access history;
- outreach settings, suppression matches, queue state, approval, send history, and kill switches;
- orders, reservations, entitlements, refunds, dependencies, projects, and webhook reconciliation;
- catalog health, integration configuration categories, failed jobs, and immutable audit references.

Dangerous actions use explicit confirmation, reason capture, server authorization, and append-only audit events. The UI cannot enable production sending or live payments merely by toggling a browser control.

## 13. Private previews and outreach

### 13.1 Research and scoring

Research is limited to no more than 20 prospects per day and records source URLs, timestamps, observations, evidence strength, contact basis, and human reviewer. A score of at least 70 may create a draft recommendation but never an automatic send.

### 13.2 Preview security

Private preview tokens are high-entropy, stored only as hashes, time-limited, revocable, and bound to an approved preview. Preview responses use noindex/noarchive and no-store protections, avoid third-party analytics leakage, show a private-preview watermark, and reveal no internal research notes or secrets. Invalid, expired, revoked, unapproved, and unavailable states are distinct and non-enumerating.

### 13.3 Outreach controls

Every queued message requires evidence review, human approval, suppression recheck at send time, and readiness gates. Only one lawful follow-up is allowed. Opt-out, bounce, complaint, negative response, or no response after the permitted sequence stops contact. Copy must be specific, factual, respectful, and free of fabricated urgency, fear, vulnerabilities, or performance claims.

Google Drive may remain an internal operator source, but no browser route reads Drive directly and no prospect or secret data is copied into public assets.

## 14. Portfolio demonstrations

Each demonstration is a complete responsive route-isolated experience, has no dead buttons, validates its forms, persists only safe demo state, emits allowlisted analytics, supports keyboard and reduced-motion use, provides media fallbacks, includes structured data, and displays the exact honesty label.

### 14.1 Greenline Lawn & Grounds

An original lead-generation demonstration with:

- ZIP-code eligibility and honest unavailable/error states;
- quote builder with service, property details, add-ons, schedule preference, and access notes;
- service explanations, starting sample prices, and caveats;
- keyboard-operable before/after comparison;
- service-area map alternative as an accessible list;
- validated scheduling flow and weather-aware sample guidance;
- prominent call and quote actions that remain safe in nonproduction;
- fictional sample reviews explicitly labelled as samples;
- LocalBusiness/service JSON-LD marked as a demonstration; and
- the exact demo events `service_area_checked`, `quote_started`, `quote_completed`, `call_clicked`, and `schedule_requested`.

### 14.2 Firejar Spicy Peanut Butter

An original collection and product-detail demonstration for Mild Flame, Hot Honey Crunch, and Hellfire Crunch with:

- sample ingredients, allergens, nutrition, heat, size, price, stock, and shipping information;
- accessible persistent local demo cart with quantity controls and removal;
- stock, validation, empty, and recovery states;
- shipping-progress feedback and relevant cross-sells;
- recipes and social-content examples;
- a clearly noncharging demonstration checkout;
- Product and Offer JSON-LD with demo-safe values;
- original/licensed food visuals only; and
- no subscription language or behavior.

### 14.3 Clearflow Plumbing

An original service and emergency lead-generation demonstration with:

- a safe sample emergency-call action and clear real-emergency caveat;
- validated scheduling flow;
- sample service areas, hours, diagnostic fee, and service categories;
- water-loss estimate and ETA tools explicitly labelled as estimates/demos;
- sample trust/licensing content that cannot be mistaken for real credentials;
- FAQ and visit-preparation guidance;
- LocalBusiness/Plumber/service JSON-LD marked as a demonstration; and
- the exact demo events `emergency_call_clicked`, `service_area_checked`, `schedule_started`, `schedule_completed`, and `water_loss_calculated`.

## 15. Reports, exports, and growth deliverables

Every finding records category, title, plain-language summary, exact evidence, source URL, screenshot/DOM/computed value when appropriate, severity, confidence, affected user group, affected business task, WCAG/reference when applicable, proposed fix, repair effort, human reviewer, and retest result. Supported categories are accessibility, usability, mobile, performance, content, SEO/local, technical quality, conversion, monetization, analytics, social growth, and security hygiene.

The $50 Homepage Reveal report must distinguish observed evidence from recommendation and concept. It includes an executive summary, top five priorities, verified findings appendix, redesigned landing page, desktop/mobile PNGs, 30-day social/growth plan, monetization experiments, implementation roadmap, and items requiring owner access or authorization. It may not become an unbounded automated issue dump.

Desktop and mobile PNG exports must be generated from the verified final render at documented viewport sizes, remain readable, and avoid implying that a concept image is an implemented website.

The 30-day social/growth plan uses five pillars: transformation/outcome, expertise/process, product or service proof, local/community story, and offer/clear action. The starting cadence to test—not promise—is three short vertical videos, two carousel/static posts, and three story sequences per week, plus one Google Business Profile post for a local business and one consented owned-audience email per week. Posting windows come from account analytics, customer timezone, staffing, and two-week experiments rather than a universal “best time.”

Every proposed post records platform, objective, hook, shot/asset list, caption outline, CTA, destination URL, UTM, owner, publish window, reuse plan, success metric, and rights/consent note. Every monetization recommendation records hypothesis, required change, effort, measurement event, success threshold, risk, and review date. Recommendations must fit the business and never guarantee revenue.

## 16. Analytics and privacy

Analytics use one consent-aware allowlisted event contract with versioned names and minimal properties. The required platform events are `free_snapshot_started`, `preview_viewed`, `plan_viewed`, `plan_selected`, `checkout_started`, `checkout_completed`, `upgrade_credit_applied`, `contact_submitted`, `intake_completed`, `portfolio_demo_opened`, `quote_started`, `quote_completed`, `emergency_call_clicked`, `cart_opened`, and `demo_checkout_started`, plus the exact route-specific demo events named above. UTMs support consented outreach and campaigns. Properties must exclude free-form secrets, full URLs with tokens, emails, names, access notes, health/safety details, payment data, and prospect research.

The service remains usable when analytics are blocked. Consent, retention, access, deletion, vendor, and purpose are documented. Test analytics are distinguishable from production data. Outreach tracking pixels are prohibited without a documented policy and lawful basis.

## 17. Error handling and resilience

Every asynchronous surface has explicit idle, pending, success, empty, validation, authorization, expired, conflict, rate-limited, backend-unavailable, and retry states as applicable.

- Network failures preserve user-entered safe form data where reasonable.
- Duplicate submissions are prevented or idempotently reconciled.
- Server errors return request IDs and safe messages without stack traces, configuration, SQL, Stripe objects, or personal data.
- Checkout cancellation never marks an order paid.
- A success URL never grants entitlement without webhook reconciliation.
- Media, animation, map, weather, and analytics failures cannot block primary content or actions.
- Operator reconciliation paths exist for stuck reservations, webhook mismatches, refund dependencies, and partial integration outages.

## 18. Accessibility, browser, and performance design

### 18.1 Accessibility

- WCAG 2.2 AA is the implementation target, not a certification claim.
- Semantic landmarks, heading order, labels, instructions, error summaries, status announcements, focus management, skip navigation, and visible focus are required.
- All controls work with keyboard and touch; no interaction depends only on hover, drag, color, animation, or pointer precision.
- Forms use programmatic errors and preserve context.
- Comparison widgets, carts, estimators, dialogs, menus, and cinematic controls receive dedicated keyboard and assistive-technology tests.
- Forced colors, reduced motion, 200% zoom, 320-pixel reflow, and screen-reader naming are verified.

### 18.2 Browsers and viewports

Playwright covers Chromium, Firefox, and WebKit. Visual and functional verification covers 1440×900, 1280×800, 1024×768, 768×1024, 390×844, and 375×667, plus 320-pixel reflow and 200% zoom. Direct routes, history, authentication, errors, checkout, private previews, demos, and reduced motion are included.

### 18.3 Performance budgets

- standard-route Lighthouse targets: performance ≥90, accessibility ≥95, best practices ≥95, SEO ≥95;
- cinematic-route Lighthouse target: performance ≥85 while maintaining the other stated quality targets;
- initial JavaScript <180 KB gzip unless an approved, measured exception is documented;
- CSS <70 KB gzip;
- initial transfer <1.5 MB;
- hero poster <250 KB;
- no unnecessary multi-megabyte media;
- slow-4G and CPU-throttled primary journeys remain comprehensible and operable.

## 19. Security and authorized testing

Security verification covers dependency audit, secret scanning, built-bundle scanning, headers/CSP, origin and method enforcement, schema and size limits, rate limits, auth expiry, IDOR/RLS tests, token hashing/expiry/revocation, webhook signature/idempotency, checkout tampering, entitlement races, refund ordering, suppression enforcement, and safe logging.

Load and active security tools such as k6, Locust, ZAP, or Nuclei may run only against an owned and explicitly authorized nonproduction target. They may never run against prospect websites or unrelated third parties. Scope, rate, authorization, time, result, and cleanup are recorded.

## 20. Delivery sequence

Implementation will be planned and executed in dependency order:

1. baseline evidence, repo execution contract, design system, documentation skeleton, ADRs, and stale-assumption inventory;
2. canonical typed catalog and generated projections;
3. Supabase tier, entitlement, reservation, and refund-dependency migrations with RLS/RPC tests;
4. protected checkout, webhook reconciliation, refund logic, and complete payment matrix;
5. customer account and operator workspace;
6. private preview and outreach safety workflow;
7. public route architecture, homepage, education, pricing, report, policies, and analytics;
8. Greenline, Firejar, and Clearflow route-isolated demonstrations;
9. cinematic story, generated assets/provenance, and PNG/report exports;
10. cross-browser, accessibility, performance, load, security, recovery, and payment verification;
11. deployment preview, rollback rehearsal, documentation reconciliation, and final requirement-by-requirement audit.

Each phase uses test-first implementation, preserves a passing baseline, and receives review before the next high-risk dependency layer. Forward migrations precede any code that assumes their tables or functions.

## 21. Deployment and launch boundary

Work remains on a feature branch. Verification uses Netlify preview/staging, a nonproduction Supabase environment, and Stripe test mode. Environment documentation lists categories and ownership but never values.

The rebuild will not:

- switch Stripe to live mode;
- deploy database migrations to an unconfirmed production project;
- enable outreach sending;
- publish or replace the production domain;
- run active tests against prospect sites; or
- claim launch readiness without retained verification evidence.

Production activation requires separate explicit approval, verified domain/environment ownership, secret rotation/readiness, backup and forward-recovery plan, monitoring, legal/policy review, accessibility review, payment test signoff, and rollback rehearsal.

## 22. Documentation and evidence set

The implementation creates or updates:

- root `AGENTS.md` and `design.md`;
- `docs/PRODUCT.md`;
- `docs/ARCHITECTURE.md`;
- `docs/DESIGN.md`;
- `docs/PAYMENTS.md`;
- `docs/DATA_MODEL.md`;
- `docs/SECURITY.md`;
- `docs/OUTREACH.md`;
- `docs/QUALITY.md`;
- `docs/DEPLOYMENT.md`;
- `docs/THIRD_PARTY.md`;
- relevant ADRs, runbooks, catalogs, migration notes, test matrices, and release/rollback records.

Baseline and final evidence includes route inventories, screenshots at required sizes, Lighthouse and axe results, bundle reports, console/network checks, test outputs, migration/RLS inventories, Stripe mode/catalog verification, preview deployment URL, and clearly named missing external prerequisites.

## 23. Acceptance audit

The final handoff must map every explicit item in the authoritative brief to direct evidence. Each item is marked verified, contradicted, incomplete, externally blocked, or not applicable with a reason. Absence of a detected failure is not proof.

The audit must include:

- source file or migration references for implementation requirements;
- command output and retained artifacts for test requirements;
- browser evidence for route, responsive, visual, accessibility, and state requirements;
- Supabase schema/RLS/function evidence for authorization and data requirements;
- Stripe test objects, metadata, webhook, amount, race, and refund evidence for payment requirements;
- environment and deployment evidence for operational claims;
- a secret scan of source, history-relevant changes, environment examples, logs, screenshots, and built assets;
- a list of anything requiring external credentials, business decisions, legal review, production access, or separate authorization.

Only after this audit proves every in-scope requirement and truthfully separates external launch prerequisites may the rebuild be described as complete.

The final handoff follows the required 22-part format: executive summary; architecture decisions; changed files grouped by frontend/backend/database/payments/tests/documentation; Supabase migrations; RLS summary; Stripe products/prices/webhook changes; explicit test/live status; exact upgrade calculations; demo URLs; PNG/export locations; test commands; unedited result summaries; Lighthouse evidence; Core Web Vitals evidence; cross-browser matrix; authorized security scan; k6/Locust summary; known limitations; launch blockers; deployment instructions; rollback instructions; and confirmation that no outreach was sent without human approval.

## 24. Design decisions approved by this specification

- Keep Vite, Netlify Functions, Supabase, and Stripe.
- Use route-isolated demonstration modules in the single Vite application.
- Use a shared accessible foundation while keeping demo state and styles independently scoped.
- Preserve server authority for price, credit, identity, access, suppression, and settlement.
- Implement entitlements before upgrade checkout.
- Use the exact $0/$50/$200/$250 catalog and exact cumulative upgrade differences.
- Use the required editorial diagnostic-lab visual direction and exact palette.
- Keep Stripe in test mode, outreach disabled, and deployment nonproduction until separate approval.
- Treat the complete authoritative prompt as the acceptance contract.

## 25. Open implementation details

The following are intentionally deferred to the implementation plans, where repository evidence and tests can determine the safest exact form without changing the approved product behavior:

- precise TypeScript adoption boundary in the currently JavaScript repository;
- exact Supabase column names and RPC signatures;
- exact operator role-claim mechanism compatible with the existing auth model;
- exact analytics provider or first-party transport;
- exact report renderer and PNG capture mechanism;
- exact asset-generation prompts and licensed typeface choice;
- exact nonproduction project/site identifiers and external secret values.

Any choice that changes product scope, authorization, payment amounts, privacy posture, active-testing boundary, framework, or launch state requires a new decision review rather than being silently decided during implementation.
