# Design system and inspiration record

**Status:** Mixed — `IMPLEMENTED` design contract and baseline, `PLANNED` rebuilt components and pages, `EXTERNALLY BLOCKED` remote asset/provider evidence, and `LAUNCH-ONLY` final brand/legal approval.

**Owner:** Product design with frontend engineering and accessibility review.

**Authority:** [approved rebuild specification](superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md), root `design.md`, and the [public experience plan](superpowers/plans/2026-07-18-accessrevamp-public-experience-reports.md).

## Direction

The approved direction is “editorial evidence studio”: warm and tactile, but precise enough to make trust, pricing, proof, and next actions obvious. Composition uses asymmetric editorial rhythm, large serif display language, compact sans-serif utility copy, visible evidence labels, diagrammatic rules, and disciplined color blocks. It must not read like a generic SaaS dashboard, template marketplace, AI gradient landing page, or sterile compliance portal.

## Tokens

| Role | Value | Use |
| --- | --- | --- |
| Ink | `#0B1020` | Primary text and deep surfaces |
| Near black | `#05070C` | Cinematic contrast and overlays |
| Bone | `#F6F1E8` | Main canvas |
| White | `#FFFFFF` | High-contrast cards and controls |
| Coral | `#FF5A3D` | Evidence/action emphasis |
| Mint | `#A7F3D0` | Positive proof and secondary accents |
| Yellow | `#F7D154` | Highlight, annotation, and selected states |
| Slate | `#6B7280` | Supporting copy where contrast permits |

Color never carries meaning alone. Text and interactive combinations must meet WCAG 2.2 AA contrast targets. Spacing follows a small fluid scale; content width, line length, and vertical rhythm take priority over ornamental density. Components may be expressive, but system feedback must remain conventional and understandable.

## Typography, layout, and components

Use a high-character serif for headlines and a legible sans serif for navigation, controls, labels, data, and body copy. Fonts require explicit licenses, local/self-hosted delivery where appropriate, metric-safe fallbacks, and no text hidden until remote font load. Headings keep a valid hierarchy on every route.

Reusable patterns include the shell, proof strip, evidence card, finding row, tier card, cumulative-credit table, comparison control, disclosure, report module, state panel, form field/error summary, dialog, demo frame, cart/estimator, account timeline, and operator queue. Their hover, focus, active, disabled, busy, success, warning, error, empty, offline, and reduced-motion states are documented and tested.

## Inspiration record — principles only

Reviewed on 2026-07-18. These are discovery galleries, not asset or component licenses.

1. **Awwwards collections** — <https://www.awwwards.com/basic/collections/>. Learned: alternate quiet editorial fields with denser proof moments; use large type to establish hierarchy; let section rhythm carry narrative. Intentionally not copied: any submitted site’s logo, copy, images, exact grid, transitions, or recognizable composition.
2. **Godly** — <https://godly.website/>. Learned: treat motion as a paced transition between clear story beats and preserve a strong static frame. Intentionally not copied: proprietary video, branded art, code, cursor behavior, or complete page sequences.
3. **21st.dev** — <https://21st.dev/>. Learned: inspect isolated interaction states for navigation, comparison, dialog, and forms. Intentionally not copied: component source, dependency stacks, tokens, or product UI; AccessRevamp components are original and native to the retained stack.

Supplied screenshots were used only as a factual pre-rebuild baseline and are retained under `docs/evidence/baseline/2026-07-18/`. No arbitrary Pinterest, gallery, or prospect asset enters production.

## Motion and media

Motion explains sequence, evidence, or spatial relationship. Standard transitions remain brief and interruptible. Cinematic content uses native scroll, real HTML copy and links, poster-first loading, bounded media, mobile simplification, visibility pausing, and a meaningful reduced-motion presentation. No essential information exists only in canvas, video, hover, autoplay audio, or pointer movement.

Generated or third-party media requires a provenance record with prompt/source, model/provider, date, editor, rights basis, transformations, route, dimensions, compression, alt treatment, and human approval. The system prefers CSS, SVG, and original lightweight assets before raster or video generation.

## Accessibility and responsive proof

Verify skip navigation, landmarks, heading order, names, labels, descriptions, error association, status announcements, focus order, focus visibility, keyboard/touch parity, 320-pixel reflow, 200% zoom, forced colors, reduced motion, and screen-reader naming. Layouts are intentionally checked at 1440×900, 1280×800, 1024×768, 768×1024, 390×844, and 375×667.

## Delivery states

### IMPLEMENTED

The approved tokens, editorial direction, baseline screenshots, current route shell, and root design contract exist. The baseline exposes pre-rebuild contrast and heading-order defects that are not final-state exceptions.

### PLANNED

The public component system, all responsive states, rebuilt route compositions, three distinct demos, report export, social artwork, provenance manifest, and cinematic experience remain scheduled work.

### EXTERNALLY BLOCKED

Any provider-generated media, external license proof, or remote brand asset requires available authorized accounts and retained evidence. Missing assets use original CSS/SVG/placeholders without blocking core content.

### LAUNCH-ONLY

Final logo/brand approval, licensed font or media activation, final policy review, and production visual signoff happen only after cross-browser, accessibility, and performance evidence passes.

## Validation

Run component tests, Playwright visual journeys, axe, keyboard review, screen-reader spot checks, forced-colors/reduced-motion checks, screenshot comparison, Lighthouse, bundle budgets, and asset/provenance scans. Record exceptions with owner, rationale, measured impact, fallback, and expiry.
