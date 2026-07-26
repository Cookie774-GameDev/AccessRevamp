# Premium Homepage, Checkout, and Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved AccessRevamp homepage journey, premium plan and review experience, smooth showcase media, and guarded Stripe Checkout to the production Cloudflare Worker.

**Architecture:** Keep the existing server-rendered string-component structure and centralized design tokens. Add semantic customer-journey and value-group markup, style it through the existing responsive CSS layers, preserve the same-origin Checkout API flow, and activate payment only through the database readiness guardrails already implemented.

**Tech Stack:** JavaScript ES modules, Node test runner, Vite/Vinext, Playwright, Supabase, Stripe Checkout, Cloudflare Workers/Wrangler.

## Global Constraints

- Preserve the ink, cream, gold, coral, and warm-paper AccessRevamp identity.
- Stripe card entry remains hosted at `checkout.stripe.com`; no Stripe secret or card field enters the browser bundle.
- Support desktop, 320-pixel mobile, keyboard focus, reduced motion, forced colors, and failed-media fallbacks.
- Do not imply unlimited scope, revenue guarantees, or unbounded cinematic production.
- Keep all production mutations fail-closed and verify them after deployment.

---

### Task 1: Customer Journey and Plain-Language Process

**Files:**
- Modify: `tests/public-experience.test.mjs`
- Modify: `src/pages/home.js`
- Modify: `src/styles/cinematic-renaissance.css`
- Modify: `src/styles/mobile.css`

**Interfaces:**
- Consumes: `homePage(): string`
- Produces: `.customer-journey` and the approved six-step `.process-map` copy.

- [ ] **Step 1: Write failing content-contract tests**

Assert the three approved customer stages, their “you receive” details, and all six approved plain-language process titles and descriptions.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/public-experience.test.mjs`

- [ ] **Step 3: Implement the customer journey and process markup**

Replace the sparse Explain/Guide/Launch cards and technical process copy with the approved customer-facing sequence.

- [ ] **Step 4: Add responsive, focus-safe presentation**

Use the existing palette and layout tokens, stacking the connected journey cleanly below 700 pixels without horizontal overflow.

- [ ] **Step 5: Run the focused test and verify it passes**

Run: `node --test tests/public-experience.test.mjs tests/mobile-responsive.test.mjs`

### Task 2: Premium Plan Value Groups

**Files:**
- Modify: `tests/checkout-dashboard-polish.test.mjs`
- Modify: `src/config/tier-catalog.js`
- Modify: `src/components/cards.js`
- Modify: `src/components/order-wizard.js`
- Modify: `src/styles/components.css`
- Modify: `src/styles/order-wizard-dark-contrast.css`

**Interfaces:**
- Consumes: `Tier.features`
- Produces: grouped plan-value regions with plan-specific selected states.

- [ ] **Step 1: Write failing tests for grouped outcomes and selected states**

Assert Clarity/Presentation/Launch support, Strategy/Website/Campaign suite/Quality proof, and Cinematic direction/Scroll production/Inclusive delivery/Private collaboration.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/checkout-dashboard-polish.test.mjs tests/catalog.test.mjs`

- [ ] **Step 3: Implement semantic value groups**

Render short labeled outcome groups while preserving canonical prices, upgrade arithmetic, and bounded scope.

- [ ] **Step 4: Implement the approved gold and rose-gold selected treatments**

Animate only the perimeter and ambient light; keep content still, with reduced-motion and forced-color fallbacks.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/checkout-dashboard-polish.test.mjs tests/catalog.test.mjs tests/image-led-redesign.test.mjs`

### Task 3: Premium Review and Stripe Action

**Files:**
- Modify: `tests/checkout-dashboard-polish.test.mjs`
- Modify: `src/services/order-wizard.js`
- Modify: `src/components/order-wizard.js`
- Modify: `src/styles/order-wizard-dark-contrast.css`
- Modify: `src/services/checkout-readiness.js`

**Interfaces:**
- Consumes: selected plan, saved order draft, `/api/payment-health`
- Produces: compact commission folio and one enabled `Continue to Stripe` action only when readiness is exact.

- [ ] **Step 1: Write failing review and readiness tests**

Assert selected plan/amount anchor, grouped value, timeline, portfolio link, private storage assurance, and exact Stripe action wording.

- [ ] **Step 2: Run tests and verify the intended failures**

Run: `node --test tests/checkout-dashboard-polish.test.mjs tests/checkout-readiness.test.mjs`

- [ ] **Step 3: Implement the review folio**

Keep the brief secondary and display one clear Stripe-hosted-payment action.

- [ ] **Step 4: Preserve fail-closed readiness behavior**

Keep unavailable, malformed, and network failure states disabled and actionable.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/checkout-dashboard-polish.test.mjs tests/checkout-readiness.test.mjs tests/checkout.test.mjs`

### Task 4: Showcase Performance and Media Packaging

**Files:**
- Modify: `tests/showcase-smoothing.test.mjs`
- Modify: `tests/netlify-ffmpeg-build.test.mjs`
- Modify: `src/services/showcase-comparison.js`
- Modify: `scripts/optimize-showcase-videos.mjs`
- Modify: `src/styles/performance.css`

**Interfaces:**
- Consumes: `showcasePairs`, media duration, scroll/drag/range targets.
- Produces: one active chapter, neighbor preload, coalesced fast seek, exact settled frame, inactive-media release.

- [ ] **Step 1: Add failing controller and packaging assertions**

Assert neighbor-only preload, fast-seek support, exact settle, inactive release, and scrub-ready derivative metadata.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test tests/showcase-smoothing.test.mjs tests/netlify-ffmpeg-build.test.mjs`

- [ ] **Step 3: Implement the controller changes**

Coalesce to the latest target, use approximate seek only for large jumps, settle exactly, and release inactive media.

- [ ] **Step 4: Verify packaged media**

Run: `npm run optimize:showcases`

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/showcase-smoothing.test.mjs tests/netlify-ffmpeg-build.test.mjs tests/master-execution.test.mjs`

### Task 5: Production Integration and Deployment

**Files:**
- Modify only if required: generated Cloudflare deployment configuration.

**Interfaces:**
- Consumes: green commit, existing Cloudflare secret bindings, guarded payment runtime settings.
- Produces: GitHub `main` and production `accessrevamp.com` on the same verified commit.

- [ ] **Step 1: Run the complete quality gate**

Run: `npm run check && npm run security:local && npm run verify:requirements && npm run quality:budgets`

- [ ] **Step 2: Run browser verification**

Run Playwright for desktop and mobile homepage, plan selection, review layout, showcase forward/reverse scroll, and overflow.

- [ ] **Step 3: Commit and push the implementation**

Commit only reviewed source, tests, and generated artifacts required by the build.

- [ ] **Step 4: Merge the verified branch into `main` and push**

Confirm remote `main` equals the tested merge commit.

- [ ] **Step 5: Dry-run and deploy the Worker**

Run `npx wrangler deploy --dry-run --keep-vars`, then `npx wrangler deploy --keep-vars`.

- [ ] **Step 6: Verify production**

Require the production homepage to contain the approved copy, desktop/mobile screenshots to match the responsive design, `/api/payment-health` to return exact readiness, and an authenticated Checkout Session URL to use `https://checkout.stripe.com`.
