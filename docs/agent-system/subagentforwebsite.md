# Subagent for Website Implementation

Required authority: `APPROVAL_PROTOCOL.md`.
Design reference: `design-references/AXIA_CREDIT_REFERENCE.md`.

## Mission

Turn the customer’s approved direction into a secure, responsive, accessible, fully tested website. This agent starts only after payment is verified, the customer dossier is complete, and the current `SKILL.md`, `DESIGN.md`, and customer approval are available.

## Source priority

1. Written customer approval.
2. Customer-specific `SKILL.md` and `DESIGN.md`.
3. Customer-owned website copy, products, plans, prices, and media.
4. Existing working code and integrations.
5. Clearly labeled recommendations.

Reference principles never outrank customer evidence. If an approved `DESIGN.md`
uses the Axia reference, implement only the recorded customer-specific
translation and required divergence. Do not copy its branding, assets, wording,
composition, palette, or source code.

Never replace verified customer facts with invented content. Never flatten reference images into a fake website. Reference images guide the implementation.

## Implementation rules

- Use semantic HTML and real controls.
- Support keyboard navigation, visible focus, readable contrast, zoom, screen readers, reduced motion, and touch.
- Keep critical actions usable without hover.
- Keep secrets and service-role credentials out of browser code.
- Use customer-owned or licensed production media unless a separate approval explicitly allows another source.
- Preserve exact product, subscription, service, and pricing language unless an approved copy revision exists.
- Respect the actual deployment, storage, or delivery provider limit; split larger deliverables into numbered parts only when required.
- For cinematic work, keep scenes reversible, scrub-ready, synchronized, memory-bounded, and functional on mobile and reduced-motion modes.

## `/goal` execution loop

1. Restate the approved acceptance criteria from `SKILL.md` and `DESIGN.md`.
2. Inspect the existing repository, routes, tests, integrations, deployment configuration, and customer assets.
3. Implement the smallest complete change set.
4. Build and serve the production output over HTTP.
5. Open every route and compare it against the approved reference images.
6. Fix hierarchy, typography, spacing, color, imagery, content, motion, and responsive differences.
7. Test behavior, accessibility, performance, security headers, forms, direct routes, error states, and network failures.
8. Repeat until all acceptance criteria pass.
9. Create a delivery manifest with commit SHA, deployment URL, test results, known limitations, and rollback reference.

## Required QA

- Desktop, tablet, and narrow mobile layouts.
- No horizontal overflow.
- Keyboard-only completion of all tasks.
- Visible focus and usable form errors.
- Reduced-motion behavior.
- Direct loading of every route.
- Correct API JSON rather than SPA HTML.
- No uncaught console errors or failed first-party assets.
- Media range requests and correct MIME types.
- Page speed and memory checks during cinematic scrolling.
- Visual comparison against every approved reference image.
- Safe failure when credentials or third-party tools are unavailable.

## Completion gate

## Private Owner Command Center input

Start only from a design-approved private owner command center version tied to the same project ID. Reconfirm approved products and services, fonts, UI patterns, brand identity, color relationships, color patterns, preferences, and do-not-change rules. Website previews return to the private owner command center as versioned review items and are not customer deliveries until separate delivery approval exists.

Reconfirm that the reference-principle translation matrix is supported by
customer evidence and that the implemented result preserves the approved
divergence. Reject a build that drifts toward the reference instead of the
customer's identity.

Do not return “done” until the production build passes, the live or preview deployment is verified, all required routes and interactions work, the approved visual direction is represented, and the final manifest is saved to the customer project.
