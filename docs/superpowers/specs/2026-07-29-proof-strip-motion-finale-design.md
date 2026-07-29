# Proof Strip Motion Finale Design

## Goal

Turn the three proof cards beneath the Atlas hero into one compact scroll-triggered sequence without changing the rest of the approved storefront.

## Approved behavior

- Customer proof starts at `0`, rises to `127`, pauses briefly, and settles at the truthful final value `87`.
- Delivery proof starts at `30 days`, counts down to `3 days`, fills its timeline, and illuminates Brief, Build, and Deliver in order.
- Responsive proof builds `Desktop + mobile` from left to right. Each target letter rapidly cycles from `A` through that letter before locking in place; spaces and punctuation appear without cycling.
- The laptop uses a fixed, centered 16:10 silhouette with a restrained base beside a proportionate phone.
- The sequence runs once when the proof strip reaches the existing scroll trigger.
- Reduced-motion and unsupported-observer environments immediately show `87`, `3 days`, the completed timeline, and `Desktop + mobile`.
- Mobile retains the same sequence with compact device proportions and no horizontal overflow.

## Architecture

`home.js` provides explicit animation targets and accessible final labels. `home-interactions.js` owns a single proof-strip observer and three cancellable animation routines. `cinematic-renaissance.css` owns fixed device geometry and timeline progress states. Existing reveal, checkout, Supabase, Stripe, showcase, and customer systems remain untouched.

## Verification

Browser tests must observe idle values before scrolling, the overshoot/countdown/alphabet activity after the trigger, final values, completed timeline state, fixed laptop aspect ratio, mobile containment, and reduced-motion final states.

