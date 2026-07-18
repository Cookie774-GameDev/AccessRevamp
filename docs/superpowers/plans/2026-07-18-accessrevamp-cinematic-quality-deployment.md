# AccessRevamp Cinematic, Quality, and Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the cinematic evidence story, original generated asset pipeline, full cross-browser/accessibility/performance/security/load verification, preview deployment documentation, rollback rehearsal, and requirement-by-requirement final handoff.

**Architecture:** The cinematic route is progressive enhancement over complete static story panels. Generated assets are optimized derivatives with a provenance manifest. Quality scripts collect machine-readable evidence without claiming unavailable remote results; active load/security tests run only on an explicitly authorized nonproduction target.

**Tech Stack:** Vite, native scroll/IntersectionObserver/requestAnimationFrame, Playwright, axe-core, Lighthouse, image generation skill, Sharp or existing image tooling only if justified, k6/Locust when installed and authorized, Netlify preview, Supabase nonproduction, Stripe test mode.

## Global Constraints

- Cinematic story: scattered signals → verified evidence → redesigned hierarchy → clear action.
- Up to four story beats and one primary conversion action.
- Reduced motion receives complete static panels; motion never gates content.
- Generated assets live in `public/assets/generated/` with AVIF/WebP/PNG derivatives and `manifest.json` provenance.
- Approved media only: original generated, client-owned with written rights, properly licensed stock, or custom code-generated motion.
- Cinematic Lighthouse performance target ≥85; accessibility/best-practices/SEO retain the approved targets.
- Authorized active testing only on owned nonproduction infrastructure; never on prospects or third parties.
- No live Stripe switch, production Supabase migration, outreach sending, or production-domain replacement.
- Do not claim completion from missing or indirect evidence.

---

## File responsibility map

- `src/pages/cinematic.js`, `src/cinematic-scroll.js`, `src/cinematic-scroll.css`: static-first four-beat cinematic experience and cleanup.
- `public/assets/generated/manifest.json`: generated-asset provenance and derivative inventory.
- `scripts/verify-generated-assets.mjs`: dimensions/formats/hash/provenance validation.
- `scripts/quality/*.mjs`: route screenshots, Lighthouse, axe, bundle, console/network, and evidence aggregation.
- `tests/e2e/visual-matrix.spec.mjs`: viewports, zoom, forced colors, reduced motion, slow network, and failure states.
- `tests/load/accessrevamp.js`: authorized staging load model with safe thresholds.
- `docs/evidence/`: unedited JSON/text outputs and human browser matrix.
- `docs/QUALITY.md`, `SECURITY.md`, `DEPLOYMENT.md`, `THIRD_PARTY.md`, `IMPLEMENTATION_STATUS.md`: reconciled operational truth.
- `docs/FINAL_HANDOFF.md`: required 22-part final handoff and requirement crosswalk.

### Task 1: Static-first four-beat cinematic story

**Files:**
- Modify: `src/pages/cinematic.js`
- Modify: `src/cinematic-scroll.js`
- Modify: `src/cinematic-scroll.css`
- Modify: `tests/cinematic-scroll.test.mjs`

**Interfaces:**
- Produces beats `signals`, `evidence`, `hierarchy`, and `action` with complete static markup.
- Produces `setupCinematicExperience({root, reducedMotion})` cleanup function.

- [ ] **Step 1: Write failing exact-story, four-beat, cleanup, and fallback tests**

```js
for (const beat of ['scattered signals','verified evidence','redesigned hierarchy','clear action']) assert.match(html, new RegExp(beat,'i'));
assert.equal((html.match(/data-cinematic-beat=/g)||[]).length, 4);
assert.match(css, /prefers-reduced-motion:\s*reduce/);
assert.doesNotMatch(source, /preventDefault\(\).*wheel|scroll-behavior:\s*none/s);
```

- [ ] **Step 2: Run and confirm current story mismatch**

Run: `node --test tests/cinematic-scroll.test.mjs`

Expected: FAIL on the approved evidence-story contract.

- [ ] **Step 3: Implement native-scroll progressive enhancement**

Render all four beats in DOM. Enhance fine-pointer/non-reduced-motion devices with bounded transforms driven by intersection and one animation frame. Clean observer/frame/media listeners on route exit. Static mobile/reduced-motion view preserves all copy, evidence, and CTA.

- [ ] **Step 4: Verify cinematic behavior and bundle size**

Run: `node --test tests/cinematic-scroll.test.mjs tests/rebuild-architecture.test.mjs && npm run build`

Expected: tests PASS and route code remains in a bounded separate chunk.

- [ ] **Step 5: Commit cinematic story**

```bash
git add src/pages/cinematic.js src/cinematic-scroll.js src/cinematic-scroll.css tests/cinematic-scroll.test.mjs
git commit -m "feat: build evidence-led cinematic story"
```

### Task 2: Original generated assets and provenance manifest

**Files:**
- Create: `public/assets/generated/manifest.json`
- Create: `public/assets/generated/signal-field-01.avif`
- Create: `public/assets/generated/signal-field-01.webp`
- Create: `public/assets/generated/signal-field-01.png`
- Create: `public/assets/generated/evidence-layers-01.avif`
- Create: `public/assets/generated/evidence-layers-01.webp`
- Create: `public/assets/generated/evidence-layers-01.png`
- Create: `public/assets/generated/hierarchy-beacon-01.avif`
- Create: `public/assets/generated/hierarchy-beacon-01.webp`
- Create: `public/assets/generated/hierarchy-beacon-01.png`
- Create: `public/assets/generated/action-path-01.avif`
- Create: `public/assets/generated/action-path-01.webp`
- Create: `public/assets/generated/action-path-01.png`
- Create: `scripts/verify-generated-assets.mjs`
- Create: `tests/generated-assets.test.mjs`
- Modify: `docs/THIRD_PARTY.md`
- Modify: `package.json`

**Interfaces:**
- Produces manifest entries `{id,purpose,sourceType,tool,createdAt,promptSummary,manualEdits,rights,variants}`.
- Produces `npm run verify:assets` that validates all referenced files, formats, dimensions, bytes, and SHA-256 hashes.

- [ ] **Step 1: Write failing manifest/provenance/format tests**

```js
for (const entry of manifest.assets) {
  assert.equal(entry.sourceType, 'original-generated');
  assert.match(entry.rights, /AccessRevamp original/i);
  assert.deepEqual(Object.keys(entry.variants).sort(), ['avif','png','webp']);
}
assert.equal(unmanifestedFiles.length, 0);
```

- [ ] **Step 2: Run and confirm missing generated-asset pipeline**

Run: `node --test tests/generated-assets.test.mjs`

Expected: FAIL for missing manifest/assets.

- [ ] **Step 3: Generate a restrained original evidence-lab visual set**

Use the `imagegen` skill for bitmap assets. Create abstract diagnostic surfaces and editorial material studies only—no people, customer logos, testimonials, real businesses, screenshots, or legible fake evidence. Keep the palette aligned to ink/bone/coral/mint/yellow. Record factual prompt summaries and tool/date provenance.

- [ ] **Step 4: Create optimized derivatives and verify budgets**

Use a pinned image library only if required and documented. Hero poster must remain <250 KB; no route may add multi-megabyte media. Write exact dimensions, byte sizes, and hashes to the manifest.

Run: `npm run verify:assets && node --test tests/generated-assets.test.mjs && npm run build`

Expected: PASS and every generated file is manifested in all three formats.

- [ ] **Step 5: Commit original generated assets**

```bash
git add public/assets/generated scripts/verify-generated-assets.mjs tests/generated-assets.test.mjs docs/THIRD_PARTY.md package.json package-lock.json
git commit -m "feat: add original cinematic asset set"
```

### Task 3: Viewport, zoom, forced-colors, reduced-motion, and failure matrix

**Files:**
- Create: `tests/e2e/visual-matrix.spec.mjs`
- Create: `tests/e2e/resilience.spec.mjs`
- Create: `scripts/quality/capture-routes.mjs`
- Modify: `playwright.config.mjs`
- Create: `docs/evidence/browser-matrix.md`

**Interfaces:**
- Produces screenshots for 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 375×667, and 320×667.
- Produces console/network/result JSON for each required route and browser.

- [ ] **Step 1: Add failing viewport and state assertions**

Every required route checks horizontal overflow, visible H1, reachable primary action, focus order, no uncaught errors, no failed first-party requests, and media-failure fallback. Account/checkout/preview/demo error states use mocked safe fixtures.

- [ ] **Step 2: Run Chromium matrix and fix every failure before expanding browsers**

Run: `npx playwright test tests/e2e/visual-matrix.spec.mjs tests/e2e/resilience.spec.mjs --project=chromium`

Expected: PASS at all viewports, 200% zoom, forced colors, reduced motion, and slow-network emulation.

- [ ] **Step 3: Run Firefox and WebKit matrices**

Run: `npx playwright test tests/e2e/visual-matrix.spec.mjs tests/e2e/resilience.spec.mjs --project=firefox --project=webkit`

Expected: all tests PASS.

- [ ] **Step 4: Capture retained screenshots and unedited results**

Run: `node scripts/quality/capture-routes.mjs`

Expected: timestamped artifacts beneath `docs/evidence/routes/` with route-safe filenames and no tokens/personal data.

- [ ] **Step 5: Commit visual and resilience evidence**

```bash
git add tests/e2e scripts/quality/capture-routes.mjs playwright.config.mjs docs/evidence/browser-matrix.md docs/evidence/routes
git commit -m "test: verify responsive and resilient routes"
```

### Task 4: Axe, Lighthouse, Core Web Vitals, and bundle budgets

**Files:**
- Create: `scripts/quality/run-lighthouse.mjs`
- Create: `scripts/quality/check-budgets.mjs`
- Create: `scripts/quality/aggregate-quality.mjs`
- Create: `tests/quality-scripts.test.mjs`
- Modify: `package.json`
- Modify: `docs/QUALITY.md`

**Interfaces:**
- Produces `npm run quality:local` and machine-readable evidence beneath `docs/evidence/quality/`.
- Enforces standard and cinematic score thresholds plus bundle/transfer/poster budgets.

- [ ] **Step 1: Write failing threshold and evidence-schema tests**

```js
assert.deepEqual(STANDARD_THRESHOLDS, {performance:90,accessibility:95,bestPractices:95,seo:95});
assert.equal(CINEMATIC_THRESHOLDS.performance,85);
assert.equal(BUDGETS.jsGzip,180*1024);
assert.equal(BUDGETS.cssGzip,70*1024);
assert.equal(BUDGETS.transfer,1.5*1024*1024);
```

- [ ] **Step 2: Run and confirm missing quality scripts**

Run: `node --test tests/quality-scripts.test.mjs`

Expected: FAIL for missing modules.

- [ ] **Step 3: Implement deterministic build/serve/audit aggregation**

Run Lighthouse against representative standard routes and cinematic; capture raw JSON, versions, URL, time, throttling, and summary. Capture browser performance entries for LCP/CLS/INP or clearly mark lab proxy where INP cannot be produced. Budget checker measures gzip artifacts and route transfer.

- [ ] **Step 4: Run quality suite and fix until thresholds pass or document evidence-based exception**

Run: `npm run quality:local`

Expected: thresholds PASS. An exception requires exact route, metric, cause, measured impact, mitigation, owner, and review date; it cannot hide an accessibility or security failure.

- [ ] **Step 5: Commit quality automation and evidence**

```bash
git add scripts/quality tests/quality-scripts.test.mjs package.json package-lock.json docs/QUALITY.md docs/evidence/quality
git commit -m "test: enforce accessibility and performance budgets"
```

### Task 5: Secret, headers, authorization, and authorized security verification

**Files:**
- Create: `scripts/quality/scan-secrets.mjs`
- Create: `tests/security-contract.test.mjs`
- Create: `docs/evidence/security/README.md`
- Modify: `docs/SECURITY.md`
- Modify: `netlify.toml`

**Interfaces:**
- Produces `npm run security:local` scanning source, built assets, tracked examples, and retained artifacts for secret patterns and unsafe headers.
- Produces an authorization-scoped external scan command that requires `AUTHORIZED_STAGING_URL` and explicit `AUTHORIZED_ACTIVE_TESTING=true`.

- [ ] **Step 1: Write failing secret/header/auth-boundary tests**

```js
for (const pattern of SECRET_PATTERNS) assert.equal(scanRepository(pattern).length, 0);
for (const header of ['content-security-policy','x-content-type-options','referrer-policy','permissions-policy']) assert.match(netlify, new RegExp(header,'i'));
assert.match(activeScanScript, /AUTHORIZED_ACTIVE_TESTING/);
```

- [ ] **Step 2: Run and confirm missing security automation**

Run: `node --test tests/security-contract.test.mjs`

Expected: FAIL for missing scanner/contracts.

- [ ] **Step 3: Implement redacted secret scan and owned-target guard**

Scan actual contents but output only file, line, and pattern category—never the matched secret. Block localhost/private/prospect/unapproved targets from external tooling unless the owned local target mode is explicitly selected. Document origin/method/schema/size/rate/auth/RLS/token/webhook/race/refund/suppression coverage.

- [ ] **Step 4: Run local security checks and authorized scan only when scope is present**

Run: `npm run security:local && npm audit --omit=dev --audit-level=high`

Expected: PASS and zero high-or-greater production dependency findings.

Authorized staging only: `AUTHORIZED_ACTIVE_TESTING=true AUTHORIZED_STAGING_URL=https://owned-preview.example npm run security:authorized`

Expected: ZAP/Nuclei output retained and no unresolved critical/high finding. If tooling/authorization/target is absent, record the gap and never run it elsewhere.

- [ ] **Step 5: Commit security automation/evidence**

```bash
git add scripts/quality/scan-secrets.mjs tests/security-contract.test.mjs docs/evidence/security docs/SECURITY.md netlify.toml package.json
git commit -m "test: add guarded security verification"
```

### Task 6: Authorized load model and recovery thresholds

**Files:**
- Create: `tests/load/accessrevamp.js`
- Create: `scripts/quality/run-authorized-load.mjs`
- Create: `docs/evidence/load/README.md`
- Modify: `docs/QUALITY.md`

**Interfaces:**
- Produces guarded k6 scenarios for public reads, free snapshot limits, entitlement quote, and safe mocked checkout boundary.
- Thresholds: error rate <1%, public p95 <800ms, function p95 <1500ms under the agreed small staging load; no Stripe session creation loop.

- [ ] **Step 1: Write failing guard and threshold tests**

```js
assert.match(wrapper, /AUTHORIZED_ACTIVE_TESTING/);
assert.match(k6Source, /http_req_failed.*rate<0\.01/);
assert.doesNotMatch(k6Source, /create-checkout.*constant-arrival-rate/s);
```

- [ ] **Step 2: Run contract test and confirm missing load model**

Run: `node --test tests/quality-scripts.test.mjs`

Expected: FAIL for missing guarded load files.

- [ ] **Step 3: Implement low-rate owned-staging scenarios and result capture**

Default to refusal. Require explicit flag and HTTPS allowlisted target; cap virtual users/duration; use synthetic nonpersonal data; respect endpoint rate limits; never test prospects or create real charges.

- [ ] **Step 4: Run only with explicit owned staging authorization**

Run: `AUTHORIZED_ACTIVE_TESTING=true AUTHORIZED_STAGING_URL=https://owned-preview.example node scripts/quality/run-authorized-load.mjs`

Expected: thresholds PASS and raw k6 JSON retained. Without target/tool/authorization, record “not run” with exact reason and do not call it passed.

- [ ] **Step 5: Commit load model and truthful evidence state**

```bash
git add tests/load scripts/quality/run-authorized-load.mjs docs/evidence/load docs/QUALITY.md tests/quality-scripts.test.mjs
git commit -m "test: add guarded staging load model"
```

### Task 7: Preview deployment, rollback rehearsal, and documentation reconciliation

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DESIGN.md`
- Modify: `docs/PAYMENTS.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/SECURITY.md`
- Modify: `docs/OUTREACH.md`
- Modify: `docs/QUALITY.md`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `docs/THIRD_PARTY.md`
- Create: `docs/ROLLBACK_REHEARSAL.md`
- Create: `tests/documentation-accuracy.test.mjs`

**Interfaces:**
- Produces exact preview deploy steps, forward-recovery database steps, asset/app rollback, environment categories, ownership, monitoring, and launch blockers.

- [ ] **Step 1: Write failing docs-to-code accuracy tests**

Verify required routes, catalog amounts, migration filenames, scripts, event names, sending default, test-mode statement, and no unverified deployed/live claim.

- [ ] **Step 2: Reconcile every document against current code and retained evidence**

Remove stale two-plan/$199 copy. List Netlify/Supabase/Stripe environment variable names only. Document how to deploy a feature preview, apply nonproduction migrations, configure test webhook, validate redirect URLs, and revert app assets while using forward recovery for migrations.

- [ ] **Step 3: Deploy only an authorized Netlify preview when credentials/site scope exist**

Run: `netlify deploy --build`

Expected: a preview URL, not production. If authentication/site ownership is absent, record the exact blocker without publishing elsewhere.

- [ ] **Step 4: Rehearse documented rollback locally/nonproduction**

Build the previous known-good commit, confirm it serves, then return to the feature tip without destructive reset. Validate database forward-recovery SQL in local/nonproduction Supabase when available.

- [ ] **Step 5: Verify and commit reconciled operations docs**

Run: `node --test tests/documentation-accuracy.test.mjs && npm run check`

Expected: PASS.

```bash
git add README.md docs tests/documentation-accuracy.test.mjs
git commit -m "docs: reconcile deployment and rollback operations"
```

### Task 8: Requirement crosswalk and 22-part final handoff

**Files:**
- Create: `docs/FINAL_HANDOFF.md`
- Create: `docs/evidence/requirements.json`
- Create: `scripts/quality/verify-requirements.mjs`
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Modify: `package.json`

**Interfaces:**
- Produces `npm run verify:requirements` that rejects missing/indirect evidence and unresolved in-scope requirements.
- Produces the exact 22-part handoff required by the brief.

- [ ] **Step 1: Encode every explicit brief requirement with direct evidence type/path/command/state**

Allowed states are `verified`, `contradicted`, `incomplete`, `externally-blocked`, and `not-applicable-with-reason`. `verified` requires an existing direct artifact and matching command/result where applicable.

- [ ] **Step 2: Write and run the failing verifier**

Run: `node scripts/quality/verify-requirements.mjs`

Expected: FAIL while any in-scope item is missing, contradicted, incomplete, or weakly evidenced.

- [ ] **Step 3: Close every in-scope gap and rerun the entire quality suite**

Run: `npm run check && npm run verify:assets && npm run quality:local && npm run security:local && npx playwright test`

Expected: all commands PASS. External launch-only requirements remain explicitly blocked and are not mislabelled complete.

- [ ] **Step 4: Write the exact 22-part handoff**

Include executive summary; decisions; grouped changed files; migrations; RLS; Stripe changes; test/live status; upgrade calculations; demo URLs; PNG locations; commands; unedited summaries; Lighthouse; Core Web Vitals; browsers; authorized security; k6/Locust; limitations; launch blockers; deployment; rollback; and confirmation no outreach was sent without human approval.

- [ ] **Step 5: Final secret/fabrication/deployment audit and commit**

Run: `npm run verify:requirements && git diff --check && git status --short`

Expected: requirements verifier PASS for all implementation-scope items, no whitespace errors, and only the intended final handoff changes pending.

```bash
git add docs/FINAL_HANDOFF.md docs/evidence/requirements.json scripts/quality/verify-requirements.mjs docs/IMPLEMENTATION_STATUS.md package.json package-lock.json
git commit -m "docs: complete verified production handoff"
```
