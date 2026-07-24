# Cloudflare Showcase Media Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Preserve the public site’s current UI, design, scroll interaction, and functionality while removing unnecessary initial showcase-video transfer and making Cloudflare Worker video delivery honor HTTP byte-range requests.

**Architecture:** The homepage will keep its existing IntersectionObserver-driven showcase lifecycle, but will not explicitly start the first video pair before a visitor reaches the showcase area. The Worker will become first handler only for showcase MP4 paths, read the immutable asset via the Cloudflare asset binding, and return standards-compliant single byte-range responses when a client sends `Range`.

**Tech Stack:** Vite/Vinext, Cloudflare Worker static assets, Node.js built-in test runner, existing Playwright validation, GitHub source deployment, Cloudflare Sites hosting.

**Constraints:**

- Do not change page markup, styling, copy, visual design, scroll distances, video controls, or application behavior.
- Do not alter Supabase schema, Auth, Storage, or application data; showcase media is packaged as public static assets.
- Support normal full asset delivery plus valid single `bytes=` requests, including a standards-compliant `416` for invalid ranges.
- Run focused tests before and after implementation, then `npm run check`.

## Task 1: Capture the eager-loading regression

**Files:**

- Modify: `tests/showcase-smoothing.test.mjs`
- Modify: `src/services/showcase-comparison.js`

1. Add an assertion that the comparison service does not schedule an idle `auto` preload for the first chapter.
2. Run `node --test tests/showcase-smoothing.test.mjs` and confirm it fails on the current implementation.
3. Remove only the unconditional first-chapter metadata/idle preload. Keep the existing observer behavior and retain a metadata fallback solely for browsers without `IntersectionObserver`.
4. Run the focused test and confirm it passes.

## Task 2: Capture and implement range delivery

**Files:**

- Create: `tests/cloudflare-media-range.test.mjs`
- Create: `worker/media-range.mjs`

1. Add tests that use an in-memory asset response and verify `bytes=3-6` returns `206`, the correct body and response headers, and an out-of-bounds request returns `416`.
2. Run `node --test tests/cloudflare-media-range.test.mjs` and confirm it fails because the helper is absent.
3. Implement a dependency-free helper which preserves safe source headers, parses a single byte range, and creates `206`/`416` responses without changing non-range delivery.
4. Run the focused test and confirm it passes.

## Task 3: Wire the helper into the production Worker

**Files:**

- Modify: `vite.config.js`
- Modify: `worker/index.ts`

1. Configure a Cloudflare static asset binding and run the Worker first only for `/media/showcases/*.mp4`.
2. In the Worker, pass ordinary showcase MP4 requests directly to the asset binding; for ranged requests, retrieve the asset without a `Range` header and return the helper’s partial response.
3. Preserve existing application routing for every non-showcase path.
4. Run both focused tests.

## Task 4: Verify, publish, and validate production delivery

**Files:**

- Verify only: built assets and deployed Worker/Sites output

1. Run `npm run check` and the existing public-route/browser tests applicable to the deployment.
2. Commit the focused repair and push it to `Cookie774-GameDev/AccessRevamp`.
3. Deploy the exact commit through the configured Sites project, attach the existing public custom domains only after the deployment passes smoke tests, and ensure no Netlify endpoint is involved.
4. Confirm from the public domain that the homepage returns HTTP 200 and a showcase `Range` request returns HTTP 206 with `Accept-Ranges: bytes`.
