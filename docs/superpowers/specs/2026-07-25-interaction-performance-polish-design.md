# Interaction Performance Polish Design

## Approved direction

The two July 25 screen recordings and the accompanying request are the approved design. This pass fixes interaction defects without changing the page structure or brand.

## Root causes

- Shared button hover rules replace a light background with charcoal without replacing inherited dark text.
- Order-plan selection uses one static border for every plan.
- The hero caches its viewport rectangle while the page moves, and showing the fixed header beneath the pointer causes a pointer-leave trap.
- Touch capture on the hero prevents natural mobile page scrolling.
- Showcase chapters span more than five viewport heights, smooth for too long after direction changes, and can wait 160 ms before coalescing the next seek.

## Design

- Every charcoal button hover has white text; light/ghost hover variants explicitly keep dark text.
- The $200 plan uses a continuously moving champagne/gold border when selected and a quieter preview on hover.
- The $250 plan uses a richer rose/champagne/gold animated border. The card interior remains readable and still.
- Reduced-motion users receive the same premium gradients without animation. Forced-colors users receive a clear system-color outline.
- The hero header remains predictably visible, the reveal coordinates are recomputed against the current hero bounds, and touch users scroll naturally while retaining the reveal button.
- Showcase UI progress remains animation-frame driven, while video presentation is throttled to a sustainable rate. Faster smoothing, shorter chapters, tighter seek coalescing, and exact boundary commits make wheel reversal responsive.

## Verification

- Regression tests cover hover contrast, plan-specific animated borders, reduced motion, current hero geometry, mobile touch behavior, and showcase responsiveness constants.
- Browser checks run at desktop and mobile widths, including rapid forward/reverse scrolling and order-plan selection.
- The full repository check and production build must pass before publishing.
