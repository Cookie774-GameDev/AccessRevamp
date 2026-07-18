# AccessRevamp Public Experience and Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete editorial diagnostic-lab marketing experience, factual pricing/process/methodology content, free snapshot, consent-aware analytics, and the $50 report/PNG/social-growth deliverable workflow.

**Architecture:** Server-rendered HTML strings remain organized as focused page/component modules in the Vite SPA. All interactive modules progressively enhance semantic HTML and return cleanup functions. Report data is structured and human-reviewed; PNG export is a deterministic Playwright capture of an approved render.

**Tech Stack:** Vite ES modules, CSS, Netlify Functions, Supabase, Playwright, axe-core, Node test runner.

## Global Constraints

- Direction: “Editorial diagnostic lab meets cinematic creative studio.”
- Hero: “Your website is already telling us where customers get stuck.”
- Primary CTA: “Get the $50 Homepage Reveal”; secondary CTA: “See a verified example.”
- No fake clients, logos, reviews, ratings, revenue, scarcity, outcomes, scores, screenshots, or compliance claims.
- Public observations are passive and evidence-backed; authorized testing is separately identified.
- Every interaction works with keyboard, touch, reduced motion, delayed JS, and failed media.
- Standard-route targets: Lighthouse performance ≥90, accessibility ≥95, best practices ≥95, SEO ≥95.
- Initial JS <180 KB gzip, CSS <70 KB gzip, transfer <1.5 MB, hero poster <250 KB.
- Checkout UI must display server-verified credit and never expose Stripe Price IDs.

---

## File responsibility map

- `src/styles/tokens.css`, `base.css`, `components.css`, `pages.css`, `motion.css`: approved design system and resilient layouts.
- `src/components/diagnostic.js`, `pricing.js`, `forms.js`, `evidence.js`: reusable public modules.
- `src/pages/home.js`: fourteen-module homepage narrative.
- `src/pages/process.js`, `pricing.js`, `portfolio.js`, `free-snapshot.js`, `methodology.js`, `sample-report.js`: required public content.
- `netlify/functions/free-snapshot.mjs`: rate-limited manual-review request.
- `src/services/analytics.js`: consent-aware allowlist and data minimization.
- `src/report/report-model.js`, `report-page.js`, `scripts/export-report-png.mjs`: structured report and deterministic exports.
- `tests/public-experience.test.mjs`, `tests/report-contract.test.mjs`, `tests/analytics-contract.test.mjs`: content, behavior, and safety contracts.

### Task 1: Approved visual tokens and accessible primitives

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/base.css`
- Modify: `src/styles/components.css`
- Modify: `src/styles/motion.css`
- Create: `src/components/forms.js`
- Create: `src/components/evidence.js`
- Modify: `tests/design-system.test.mjs`

**Interfaces:**
- Produces CSS custom properties `--ink`, `--near-black`, `--bone`, `--white`, `--signal-coral`, `--mint`, `--electric-yellow`, and `--slate`.
- Produces `field()`, `errorSummary()`, `evidenceCard()`, and `statusMessage()` semantic HTML helpers.

- [ ] **Step 1: Write failing exact-token, focus, reflow, and reduced-motion tests**

```js
for (const [name,value] of Object.entries(REQUIRED_TOKENS)) assert.match(tokens, new RegExp(`--${name}:\\s*${value}`,'i'));
assert.match(base, /:focus-visible/);
assert.match(base, /overflow-wrap|word-break/);
assert.match(motion, /prefers-reduced-motion:\s*reduce/);
```

- [ ] **Step 2: Run and confirm palette-contract failure**

Run: `node --test tests/design-system.test.mjs`

Expected: FAIL because the current ultramarine palette differs.

- [ ] **Step 3: Implement tokens, typography, semantic controls, and resilient states**

Use bone canvas, ink/near-black diagnostic fields, coral actions, mint verified evidence, and yellow sparingly. Add high-contrast focus rings, minimum 44px touch targets, readable measure, container queries/media queries, forced-colors styles, and static reduced-motion rules.

- [ ] **Step 4: Verify design-system tests and CSS budget**

Run: `node --test tests/design-system.test.mjs && npm run build`

Expected: PASS and generated CSS remains below 70 KB gzip.

- [ ] **Step 5: Commit the design foundation**

```bash
git add src/styles src/components/forms.js src/components/evidence.js tests/design-system.test.mjs
git commit -m "feat: apply diagnostic editorial design system"
```

### Task 2: Fourteen-module homepage

**Files:**
- Create: `src/components/diagnostic.js`
- Create: `src/components/public-pricing.js`
- Modify: `src/pages/home.js`
- Modify: `src/services/checkout.js`
- Modify: `tests/public-experience.test.mjs`

**Interfaces:**
- Produces `diagnosticSpectrum()`, `evidenceWalkthrough()`, `processRail()`, and `tierGrid(catalog, quote)`.
- Consumes canonical `TIERS` and server entitlement quote.

- [ ] **Step 1: Write failing module, exact-copy, and no-fabrication tests**

```js
assert.equal((home.match(/<section\b/g) || []).length >= 14, true);
for (const copy of [HERO, PRIMARY_CTA, SECONDARY_CTA, 'Scout','Verify','Preview','Approve','Build','Measure']) assert.match(home, new RegExp(copy));
assert.doesNotMatch(home, /sites improved|revenue increased|five stars|limited spots/i);
```

- [ ] **Step 2: Run and confirm missing narrative modules**

Run: `node --test tests/public-experience.test.mjs`

Expected: FAIL on required hero/modules.

- [ ] **Step 3: Implement the fourteen modules in the approved story order**

The diagnostic spectrum includes accessibility, usability, mobile, performance, content, SEO/local, conversion, monetization, analytics, social growth, and security hygiene without unsupported numeric scores. The before/evidence/after module shows source, observation, confidence, cautious impact, and design response. Pricing lists list price, verified credit/due/resulting entitlement when signed in, “No subscription,” scope, and refund boundary.

- [ ] **Step 4: Verify home content and interaction cleanup**

Run: `node --test tests/public-experience.test.mjs tests/catalog.test.mjs tests/rebuild-architecture.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the homepage**

```bash
git add src/components/diagnostic.js src/components/public-pricing.js src/pages/home.js src/services/checkout.js tests/public-experience.test.mjs
git commit -m "feat: build evidence-led homepage narrative"
```

### Task 3: Process, pricing, methodology, portfolio index, contact, and policies

**Files:**
- Modify: `src/pages/process.js`
- Modify: `src/pages/pricing.js`
- Create: `src/pages/portfolio.js`
- Create: `src/pages/methodology.js`
- Modify: `src/pages/contact.js`
- Modify: `src/pages/legal.js`
- Modify: `src/data/navigation.js`
- Modify: `src/main.js`
- Create: `tests/public-route-content.test.mjs`

**Interfaces:**
- Produces complete page functions for every public route, each with one H1, metadata, current navigation state, and factual boundaries.

- [ ] **Step 1: Write failing route-content tests**

```js
for (const route of PUBLIC_ROUTES) {
  const html = render(route);
  assert.equal((html.match(/<h1\b/g)||[]).length, 1);
  assert.doesNotMatch(html, /coming soon|href=["']#["']/i);
}
```

- [ ] **Step 2: Run and confirm temporary/incomplete route failures**

Run: `node --test tests/public-route-content.test.mjs`

Expected: FAIL for missing portfolio/methodology or dead controls.

- [ ] **Step 3: Implement complete factual content and legacy redirects**

Methodology separates passive observation from authorized testing and explains confidence/human review. Pricing includes all deliverables/exclusions, exact cumulative credits, no subscription, and coded/concept/both boundary. Policies match actual operations and avoid legal/compliance promises. `/work` redirects to `/portfolio`; `/services` redirects to `/pricing` or remains a factual alias with canonical metadata.

- [ ] **Step 4: Verify all route content and metadata**

Run: `node --test tests/public-route-content.test.mjs tests/router-contract.test.mjs tests/public-experience.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the public route set**

```bash
git add src/pages src/data/navigation.js src/main.js tests/public-route-content.test.mjs
git commit -m "feat: complete public education routes"
```

### Task 4: Free Snapshot manual-review flow

**Files:**
- Create: `src/pages/free-snapshot.js`
- Create: `src/services/free-snapshot.js`
- Create: `netlify/functions/free-snapshot.mjs`
- Modify: `netlify/functions/_shared/validation.mjs`
- Modify: `src/main.js`
- Create: `tests/free-snapshot.test.mjs`

**Interfaces:**
- Produces POST body `{websiteUrl, contactEmail, consent, businessContext, requestId}` with strict limits.
- Produces response states `accepted`, `duplicate`, `rate-limited`, `invalid`, and `unavailable`; never promises instant results.

- [ ] **Step 1: Write failing validation, consent, duplicate, and rate-limit tests**

```js
assert.throws(() => snapshotSchema.parse({...valid,consent:false}), /consent/i);
assert.equal(await submitTwice(valid).second.status, 409);
assert.equal(await exceedRate(valid).status, 429);
```

- [ ] **Step 2: Run and confirm missing free-snapshot implementation**

Run: `node --test tests/free-snapshot.test.mjs`

Expected: FAIL for missing modules.

- [ ] **Step 3: Implement accessible form and server-only intake**

Store a pending manual-review request using existing contact/rate-limit patterns. Normalize public HTTPS URLs, reject localhost/private IP targets, never crawl during submission, minimize free text, and state exactly what follow-up consent covers.

- [ ] **Step 4: Verify form states and SSRF-safe validation**

Run: `node --test tests/free-snapshot.test.mjs tests/validation.test.mjs tests/scanner-resource-bounds.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit Free Snapshot**

```bash
git add src/pages/free-snapshot.js src/services/free-snapshot.js src/main.js netlify/functions/free-snapshot.mjs netlify/functions/_shared/validation.mjs tests/free-snapshot.test.mjs
git commit -m "feat: add manual free snapshot intake"
```

### Task 5: Consent-aware analytics allowlist

**Files:**
- Create: `src/services/analytics.js`
- Create: `src/config/analytics-events.js`
- Modify: `src/pages/home.js`
- Modify: `src/pages/pricing.js`
- Modify: `src/pages/portfolio.js`
- Modify: `src/pages/free-snapshot.js`
- Modify: `src/pages/contact.js`
- Modify: `src/services/checkout.js`
- Modify: `src/services/contact.js`
- Modify: `src/services/free-snapshot.js`
- Create: `tests/analytics-contract.test.mjs`
- Modify: `docs/PRODUCT.md`
- Modify: `docs/SECURITY.md`

**Interfaces:**
- Produces `track(eventName, properties = {})` and `setAnalyticsConsent(boolean)`.
- Event allowlist: `free_snapshot_started`, `preview_viewed`, `plan_viewed`, `plan_selected`, `checkout_started`, `checkout_completed`, `upgrade_credit_applied`, `contact_submitted`, `intake_completed`, `portfolio_demo_opened`, `quote_started`, `quote_completed`, `emergency_call_clicked`, `cart_opened`, `demo_checkout_started` plus exact demo events.

- [ ] **Step 1: Write failing allowlist, consent, and sensitive-property tests**

```js
assert.equal(track('unknown_event',{}), false);
for (const key of ['email','token','accessNotes','stripeId','url']) assert.throws(() => sanitizeProperties({[key]:'secret'}));
assert.equal(fakeTransport.calls.length, 0, 'no consent means no transport');
```

- [ ] **Step 2: Run and confirm missing analytics service**

Run: `node --test tests/analytics-contract.test.mjs`

Expected: FAIL for missing module.

- [ ] **Step 3: Implement local event dispatch with optional consented transport**

The default implementation emits a redacted `CustomEvent` for internal measurement hooks and sends nothing externally without configured lawful consent. UTMs may be recorded only from allowlisted keys/values. Never use outreach tracking pixels.

- [ ] **Step 4: Verify analytics and blocked-transport resilience**

Run: `node --test tests/analytics-contract.test.mjs && npm run build`

Expected: PASS; primary flows remain functional when transport throws.

- [ ] **Step 5: Commit analytics contracts**

```bash
git add src/services/analytics.js src/config/analytics-events.js src/pages/home.js src/pages/pricing.js src/pages/portfolio.js src/pages/free-snapshot.js src/pages/contact.js src/services/checkout.js src/services/contact.js src/services/free-snapshot.js tests/analytics-contract.test.mjs docs/PRODUCT.md docs/SECURITY.md
git commit -m "feat: add consent-aware analytics contract"
```

### Task 6: Structured $50 report and deterministic PNG exports

**Files:**
- Create: `src/report/report-model.js`
- Create: `src/report/report-page.js`
- Modify: `src/pages/sample-report.js`
- Create: `scripts/export-report-png.mjs`
- Create: `tests/report-contract.test.mjs`
- Create: `tests/fixtures/sample-report.json`
- Modify: `package.json`

**Interfaces:**
- Produces validated finding fields and report sections from the approved spec.
- Produces `npm run export:sample-report` writing desktop/mobile PNGs beneath `artifacts/sample-report/`.

- [ ] **Step 1: Write failing report-schema and export-dimension tests**

```js
for (const field of FINDING_FIELDS) assert.ok(schema.shape[field]);
for (const section of ['Executive summary','Top five priorities','Verified findings appendix','Monetization experiments','Implementation roadmap']) assert.match(renderSample(), new RegExp(section));
assert.deepEqual(EXPORT_VIEWPORTS, {desktop:{width:1440,height:1200},mobile:{width:390,height:1200}});
```

- [ ] **Step 2: Run and confirm missing report modules**

Run: `node --test tests/report-contract.test.mjs`

Expected: FAIL for missing modules.

- [ ] **Step 3: Implement structured human-reviewed report, social plan, and growth experiment records**

Every finding includes category, title, summary, evidence, source, screenshot/DOM/computed reference, severity, confidence, affected user/task, reference, fix, effort, reviewer, and retest result. Every post and monetization experiment includes the exact approved fields. Sample fixture is obviously fictional and contains no copied prospect data.

The export script starts the local preview, captures the dedicated print-safe report at both viewports, disables animation, waits for fonts/images, writes PNGs, and records SHA-256/dimensions in a JSON manifest.

- [ ] **Step 4: Verify report and PNG artifacts**

Run: `node --test tests/report-contract.test.mjs && npm run build && npm run export:sample-report`

Expected: PASS; two nonempty PNGs and manifest with exact viewport widths.

- [ ] **Step 5: Commit report workflow excluding generated test artifacts when ignored**

```bash
git add src/report src/pages/sample-report.js scripts/export-report-png.mjs tests/report-contract.test.mjs tests/fixtures/sample-report.json package.json package-lock.json .gitignore
git commit -m "feat: add verified report and PNG workflow"
```

### Task 7: Public route browser/accessibility checkpoint

**Files:**
- Create: `playwright.config.mjs`
- Create: `tests/e2e/public-routes.spec.mjs`
- Create: `tests/e2e/public-accessibility.spec.mjs`
- Modify: `docs/QUALITY.md`
- Modify: `docs/IMPLEMENTATION_STATUS.md`

**Interfaces:**
- Produces Chromium/Firefox/WebKit route, keyboard, reduced-motion, 320px, 200%-zoom, and axe evidence.

- [ ] **Step 1: Add direct-route, history, no-dead-control, console, and network tests**

Test all required public routes at 1440×900, 768×1024, 390×844, and 320×667; use focused visual screenshots later in the quality plan.

- [ ] **Step 2: Run the browser matrix**

Run: `npx playwright test tests/e2e/public-routes.spec.mjs tests/e2e/public-accessibility.spec.mjs --project=chromium --project=firefox --project=webkit`

Expected: all projects PASS, no serious/critical axe violations, no uncaught console errors, and no failed first-party requests.

- [ ] **Step 3: Run full build/budget checks and record evidence**

Run: `npm run check && npm audit --omit=dev --audit-level=high`

Expected: PASS and zero high-or-greater production vulnerabilities.

- [ ] **Step 4: Commit the public checkpoint**

```bash
git add playwright.config.mjs tests/e2e docs/QUALITY.md docs/IMPLEMENTATION_STATUS.md
git commit -m "test: verify public experience and reports"
```
