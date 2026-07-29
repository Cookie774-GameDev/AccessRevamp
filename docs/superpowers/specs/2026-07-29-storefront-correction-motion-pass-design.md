# AccessRevamp Storefront Correction and Motion Pass

**Status:** Owner approved for local implementation on July 29, 2026.

## Goal

Correct the storefront refresh using the supplied screenshots: compact the proof rail, replace the journey layout, keep example enlargement in flow, thin the process section, make transformations true source-to-homepage reveals, enrich plan artifacts, raise the Complete/Cinematic scope to seven individual pages, and make the Atlas reveal fast and touch-capable.

## Design

The retained identity is an editorial diagnostic lab meeting a cinematic studio: bone fields, near-black proof surfaces, serif hierarchy, coral signals, diagrammatic rules, and purposeful motion. Motion is distributed but never random: timeline drawing, device assembly, staggered ledger entry, in-flow website expansion, source-to-finished crossfades, compact artifact reveals, and CTA feedback. Reduced-motion mode presents the same information statically.

The proof rail becomes a compact three-column band. The counter waits until the rail crosses a central viewport trigger before counting 0→87. The delivery timeline remains, and recognizable CSS laptop and phone silhouettes replace abstract rectangles.

The customer journey becomes a three-row conversation ledger with alternating alignment and short local handoff arrows. No rule crosses a heading. The process section uses compact rows with stable title widths instead of narrow oversized type.

Example sites expand within their row: the active site grows while siblings contract and remain visible. No fixed overlay or visible preview button remains. Transformations show only the source photograph at rest and reveal the approved finished homepage on hover, focus, or tap.

Plan artifacts sit below each price and reveal short descriptions locally. Complete and Cinematic use a seven-page maximum. The canonical catalog, intake, legal copy, and database constraint all agree.

## Interaction and performance

The hero spotlight follows the latest pointer coordinates on the next animation frame. Only the decorative grid retains light smoothing. Hero bounds are cached and refreshed on viewport changes. Unrelated scrolling does not restart the pointer loop.

Touch uses `touch-action: pan-y`: vertical movement preserves native scrolling, while horizontal/diagonal movement updates the reveal. Pointer capture and temporary state are always released on up, cancel, lost capture, navigation, and orientation change.

## Scope boundary

Do not change prices, upgrade arithmetic, checkout, Stripe, authentication, RLS, storage, the finished generated homepage designs, or the Normal Websites vs. Cinematic Scroll Experiences section. Add one forward-only migration that changes only `project_intakes.selected_pages` cardinality from 1–5 to 1–7.

## Verification

Use test-first implementation. Verify desktop, tablet, 390×844, 375×667, and 320-pixel layouts; mouse, keyboard, and touch parity; reduced motion; forced colors; zoom; console; overflow; asset provenance; the complete test suite; lint; build; and a local production preview opened automatically for owner review.
