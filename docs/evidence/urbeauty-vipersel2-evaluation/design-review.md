# UrBeauty Concept Design Review

Task: `URBEAUTY-VIPERSEL2-DESIGNS-FOLLOWUP`

Review date: 2026-07-27 America/Chicago

## Outcome

Five clearly labeled evaluation directions were rendered and visually inspected at 1440×1200 and 390×844. The set contains three conventional homepage structures and two cinematic-scroll structures. No concept copies Axia composition, assets, or copy.

## Review matrix

| Direction | Type | Visual judgment | Responsive judgment | Best use |
|---|---|---|---|---|
| Ritual Shelf | Normal | Refined and brand-soft; the editorial headline and circular product stage create a calm ritual framing. Product variation remains visible rather than hidden. | Hero becomes a clean text-first stack with product stage below. CTAs and product cards retain usable widths. | Safest premium evolution of the current store. |
| Color Cabinet | Normal | Brightest and most retail-forward option. Black rules and asymmetric color modules turn mixed product imagery into an intentional cabinet. | Cabinet and product modules stack into full-width drawers. A long-copy intrinsic-width defect found in first capture was fixed and reverified. | Strongest option for energetic catalog browsing. |
| Quiet Utility | Normal | Most restrained and information-led. Product index, exact policy copy, and support address build clarity without sales theater. | Index rail drops away; hero and catalog become linear while preserving heading order and compact metadata. | Strongest option for trust and low-friction shopping. |
| Orbit | Cinematic | Most atmospheric option. Concentric rings frame the opening thesis; product chapters use exact images in distinct orbital shapes without modifying image pixels. | Sticky scenes become static stacked sections. Reduced-motion mode removes animation and sticky progression. | Best for a slower, immersive brand reveal. |
| Ribbon | Cinematic | Most graphic and fashion-forward option. Oversized condensed type and the exact-copy ribbon create a memorable film-strip rhythm. | Scenes stack image-first, text second; long exact product and promo words are allowed to wrap without clipping. Reduced motion stops the ribbon. | Best for a high-energy campaign feel. |

## Visual quality review

- Desktop screenshots show complete first-view compositions at the required 1440×1200 viewport.
- Mobile screenshots show each first-view composition at the required 390×844 viewport.
- All concepts have one visible `h1`, semantic sections, editable HTML text, meaningful product alt text, and visible keyboard focus.
- Concepts 04 and 05 honor `prefers-reduced-motion`.
- No text is rendered through canvas, SVG image, or flattened design export.
- Human visual inspection found no clipped navigation, illegible foreground/background pairing, missing product media, or accidental overlap in the final captures.
- Concept 05 deliberately clips the continuously repeated ribbon at the viewport edge; the track itself is paint-contained and does not cause horizontal page scrolling.

## Source, rights, and fidelity review

- Source provenance is verified to the public UrBeauty storefront or its public Shopify CDN/product JSON.
- Nine downloaded assets match the SHA-256 values in `asset-manifest.json`.
- No image was resized on disk, recompressed, recolored, retouched, composited, masked, or AI-generated. CSS only controls layout crops and geometric presentation.
- Product labels, packaging colors, and photography remain as supplied by the store.
- The current storefront’s Unsplash hero was excluded; concepts use only customer storefront logo/product media.
- Public-store provenance supports this private evaluation use. Underlying supplier/photographer license documents were not available in the public store and therefore were not independently audited; the owner should confirm those licenses before any later publication.

## Copy and claim review

- Visible customer-facing copy is mapped to exact public-store phrases or exact product titles/prices in `source-copy-map.md`.
- Evaluation-only labels are separated in a top bar and explicitly identified.
- The store’s `Loved by 2K+` metric was intentionally omitted.
- No testimonial, rating, scarcity statement, performance result, client outcome, or new product claim was invented.
- DOM/OCR-like inventory contains 691 checked words and 156 unique tokens.
- Source-vocabulary spellcheck reports zero unknown tokens. Accepted exceptions are catalog/brand terms documented in `evidence/spellcheck.json`.

## Automated verification

`verify-concepts.mjs` served pages from an ephemeral `http://127.0.0.1:{port}` origin and checked ten page/viewport combinations.

- HTTP 200 responses: 10/10
- Broken images: 0
- Console errors: 0
- Page errors: 0
- Failed requests: 0
- HTTP error responses: 0
- Horizontal overflow: 0
- Incorrect `h1` counts: 0
- Rasterized-text candidates: 0
- Asset hash mismatches: 0

The machine-readable detail is in `evidence/browser-verification.json`, `evidence/spellcheck.json`, and `evidence/hashes.json`.

## Remaining risks

1. These are evaluation concepts, not production Shopify templates. Cart, search, localization, analytics, and checkout behavior were intentionally not implemented.
2. Browser automation used local Chromium only for this concept package; broader production browser/accessibility testing would be required after a direction is selected.
3. Product prices and promotional copy were exact when researched but can change on the live store.
4. Product photographs include manufacturer/supplier lettering embedded in the original image pixels. That lettering was preserved exactly and excluded from editable-text spellcheck.
5. Public provenance is documented, but underlying third-party image-license paperwork was not publicly available.

