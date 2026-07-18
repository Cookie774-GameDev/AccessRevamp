# Third-party inventory, inspiration, and provenance policy

**Status:** `IMPLEMENTED` dependency lock and review policy, `PLANNED` asset/provider provenance, `EXTERNALLY BLOCKED` remote license/provider evidence, and `LAUNCH-ONLY` paid/live service activation.

**Owner:** Engineering with design, security, privacy, legal, and operations review.

**Authority:** [approved rebuild specification](superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md) and the [foundation/catalog plan](superpowers/plans/2026-07-18-accessrevamp-foundation-catalog.md).

## Runtime and build packages

Exact versions are declared in `package.json` and resolved with integrity hashes in `package-lock.json`. License sources are each installed package’s `package.json` and bundled license file in `node_modules`; the lockfile is the reproducible dependency record.

| Package | Version | Purpose | Declared license source |
| --- | ---: | --- | --- |
| `@axe-core/playwright` | 4.12.1 | Automated accessibility regression in controlled browser runs | package metadata: MPL-2.0 |
| `@supabase/supabase-js` | 2.110.7 | Supabase Auth and browser/server data client | package metadata/license: MIT |
| `playwright` | 1.61.1 | Browser tests and bounded passive public-page review | package metadata/license: Apache-2.0 |
| `stripe` | 22.3.2 | Server-side Checkout, webhook, and refund integration | package metadata/license: MIT |
| `zod` | 3.25.76 | Strict request and script input schemas | package metadata/license: MIT |
| `vite` | 8.1.5 | Development server and production bundling | package metadata/license: MIT |

Transitive packages remain lockfile-controlled and are reviewed through `npm audit`, license inventory, bundle inspection, and update testing. A new dependency requires a concrete need, maintenance/security/license review, measured size/cost, browser/server placement, fallback, and owner. No dependency is added only to reproduce a small native interaction.

## Inspiration references

Reviewed 2026-07-18. These pages are inspiration/discovery indexes, not code or asset licenses.

| Reference | URL | Learned principle | Intentionally not copied |
| --- | --- | --- | --- |
| Awwwards collections | <https://www.awwwards.com/basic/collections/> | Editorial scale, alternating density, and narrative section rhythm | Logos, branded media, text, exact grids, motion, or recognizable full composition |
| Godly | <https://godly.website/> | Pacing motion around clear static story beats | Videos, illustrations, source code, cursor behavior, or page sequences |
| 21st.dev | <https://21st.dev/> | Inspect isolated state patterns for controls and forms | Component code, product UI, dependencies, tokens, or layout system |

AccessRevamp rebuilds only abstract structural lessons using its own copy, tokens, components, imagery, spacing, and motion. Supplied screenshots are retained as baseline evidence, not copied as a new design. Arbitrary gallery/Pinterest assets, proprietary UI, or unlicensed “inspiration” never enter the product.

## External services

Supabase provides identity/database, Stripe provides hosted payments, Netlify provides build/functions/hosting, and Google Drive may provide internal operator context. Canva/Higgsfield or comparable tools may be used only for explicitly reviewed deliverables and rights-safe generated media. No affiliation or endorsement is implied. The public browser never reads Google Drive or exposes provider credentials.

Every generated, licensed, or third-party asset records source/provider, prompt or original reference, creation/download date, editor, rights/license basis, transformations, route/use, dimensions/compression, alt treatment, and human approval. Unknown provenance blocks asset use. Prefer original CSS, SVG, text, and locally created media.

## Delivery states

### IMPLEMENTED

Dependencies are exact and locked; the production dependency audit reports zero known vulnerabilities at the selected threshold; the retained stack has an ADR; evidence capture redacts payment identifiers and direct checkout links.

### PLANNED

The final asset manifest, font/license record, generated-media provenance, provider privacy review, bundle inventory, and post-build network-origin scan are part of the cinematic/quality work.

### EXTERNALLY BLOCKED

Remote provider account terms, paid model/stock licenses, generated asset IDs, or Drive context cannot be claimed until an authorized operator retrieves and records them. Missing provider media uses original local fallbacks.

### LAUNCH-ONLY

Paid asset purchase, production analytics/hosting/payment activation, live provider API use, or a new commercial license requires explicit approval and recorded ownership/cost/renewal/privacy terms.

## Validation

Run `npm ci`, `npm audit --omit=dev --audit-level=high`, lockfile integrity and license inventory, bundle analysis, asset/provenance contract tests, post-build secret/origin scans, and browser network inspection. Remove unused packages and expired/unproven assets before launch signoff.
