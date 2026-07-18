# AccessRevamp design contract

## Direction

AccessRevamp is an **editorial diagnostic lab meeting a cinematic creative studio**. The site should feel observant, authored, warm, and technically precise. It must not resemble a generic SaaS template, a monochrome security dashboard, or a loud agency montage.

The narrative is: **scattered signals → verified evidence → redesigned hierarchy → clear action**.

## Required tokens

```css
:root {
  --ink: #0B1020;
  --near-black: #05070C;
  --bone: #F6F1E8;
  --white: #FFFFFF;
  --signal-coral: #FF5A3D;
  --mint: #A7F3D0;
  --electric-yellow: #F7D154;
  --slate: #6B7280;
}
```

Bone is the editorial canvas. Ink and near black form diagnostic surfaces and strong type. Coral is the principal action/signal color. Mint marks verified or constructive evidence. Electric yellow appears sparingly as a high-attention annotation. Slate is supporting copy only where measured contrast passes WCAG 2.2 AA.

## Typography

Use a high-character editorial serif for display roles only when properly licensed and self-hosted; otherwise use a tuned system serif stack. Use a precise system sans-serif for body, forms, navigation, diagnostic labels, tables, and data. Body text stays readable at 200% zoom and avoids thin weights. Headline scale may be dramatic but must reflow at 320 pixels without clipping or horizontal scrolling.

## Composition

Use visible section numbers, ruled dividers, evidence tags, marginal notes, asymmetric but stable grids, and generous negative space. Dense data and policies prioritize comprehension. The page rhythm moves between bone editorial fields and ink evidence panels, using coral/mint to mark a reasoning path.

The homepage hero headline is “Your website is already telling us where customers get stuck.” The primary CTA is “Get the $50 Homepage Reveal.” The secondary CTA is “See a verified example.”

## Components and states

Every control has default, hover, focus-visible, active, disabled, busy, success, warning, and error treatment. Use native buttons, links, fields, details, range inputs, and dialogs where possible. Minimum touch target is 44×44 CSS pixels. Status is never conveyed by color alone.

Evidence components visibly separate source, observation, confidence, cautious impact, recommendation, design response, reviewer, and retest. Numeric scores are used only when a measured source and method are shown.

## Motion

Motion explains hierarchy; it does not gate content. Use short reveals, bounded transforms, and one route-scoped animation frame. Preserve native scrolling. Never hijack wheel/touch input. The cinematic route has four story beats and one clear action.

Under `prefers-reduced-motion: reduce`, render the same narrative as complete static panels. No essential information, form, comparison, preview, report, or action may depend on parallax, autoplay, drag, hover, or video.

## Responsive and failure behavior

Design and verify 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 375×667, 320-pixel reflow, 200% zoom, touch, keyboard, forced colors, slow 4G, CPU throttling, delayed JavaScript, and media failure. Reserve media dimensions. Failed visuals leave readable copy and actions. Tables reflow or scroll within labelled regions without causing page overflow.

## Portfolio demonstrations

Greenline, Firejar, and Clearflow are distinct route-isolated visual worlds sharing the platform’s accessible foundations. Each must be a complete working demonstration with validation and safe sample behavior. Every demo visibly says exactly: “Original working demo — not a client engagement.” Fictional reviews, credentials, nutrition, pricing, stock, locations, ETAs, and results must be labelled as sample/demo data.

## Assets and provenance

Generated raster assets live in `public/assets/generated/` with AVIF, WebP, and PNG variants. `manifest.json` records asset ID, purpose, source type, tool, creation date, prompt summary, manual edits, rights, dimensions, byte sizes, and hashes. Generated visuals are abstract/original and may not depict fake customers, testimonials, real businesses, screenshots, or legible invented evidence.

Use at most three documented inspiration references. Record what was learned and what was intentionally not copied. Do not download and republish arbitrary components, imagery, type, or video.

## Accessibility and truth

WCAG 2.2 AA is the target, not a certification claim. Visible focus, skip navigation, landmarks, correct headings, labels, instructions, error summaries, live regions, keyboard operation, touch support, reduced motion, and assistive-technology naming are non-negotiable.

No fake clients, owner names, emails, logos, ratings, results, revenue, conversions, vulnerabilities, compliance, scarcity, screenshots, tests, sources, or launch state. Design must strengthen truthful evidence—not decorate an unsupported claim.

