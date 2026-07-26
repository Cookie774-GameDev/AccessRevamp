# Premium Homepage, Plans, Checkout, and Performance Design

## Objective

Make the AccessRevamp homepage feel complete, premium, and easy to understand while resolving the remaining showcase-video lag and restoring the guarded live Stripe Checkout path.

The redesign must make the customer journey obvious, present each paid plan as a substantial commissioned package, keep the existing AccessRevamp identity recognizable, and preserve mobile, keyboard, reduced-motion, and forced-color support.

## Approved visual direction

The page remains grounded in the existing AccessRevamp ink, cream, gold, coral, and warm-paper identity. The new work adds depth through layered surfaces, deliberate spacing, stronger typography, and one concentrated signature treatment instead of scattering decoration across every section.

The signature element is the premium plan-selection field:

- the Complete Website Revamp uses a moving molten-gold perimeter and warm illuminated interior;
- the Cinematic Scroll Site uses a deeper rose-gold, indigo, and champagne atmosphere with a restrained animated aura;
- the interior content stays still and readable while the perimeter and ambient light communicate the selected state;
- reduced-motion users receive the same hierarchy without animation;
- forced-color users receive a clear system outline.

## Homepage customer journey

The existing “clear conversation” section becomes a complete customer-facing journey instead of a headline floating in empty space.

It contains three large sequential stages:

1. **Tell us what you need** — share the current website, business goal, preferred direction, and references.
2. **Choose your plan and designs** — select the service, complete secure checkout, then rank the visual directions inside the private workspace.
3. **Receive, review, and launch** — follow progress, review the finished work, receive the completed website and launch materials, and publish when ready.

Each stage uses one plain headline, one concise explanation, and a short “you receive” detail. The layout uses a connected path and project artifacts rather than generic numbered cards, so it fills the section with useful information while remaining easy to scan.

## Plain-language production method

The six-step “From observation to an agreed build” sequence becomes:

1. **Review your current site** — We look through the public website and note where visitors may get confused.
2. **Agree on the goal** — We confirm what the website should help customers understand or do.
3. **Choose the right plan** — You select the amount of strategy, design, creative work, and implementation you need.
4. **Pick your direction** — You review the concepts, rank your favorites, and share any special instructions.
5. **Build and test** — We create the agreed pages, check mobile and desktop, and correct visible problems.
6. **Receive and launch** — Your approved website and launch materials arrive in the private workspace, ready to publish.

The section introduction states that the customer can see what happens next at every stage. Technical assurance language remains in supporting documentation rather than the primary sales journey.

## Premium plan presentation

Plan details are grouped into meaningful customer outcomes rather than displayed as undifferentiated bullet lists.

### Homepage Reveal — $50

- **Clarity:** human-reviewed findings and a focused homepage direction.
- **Presentation:** desktop and mobile exports.
- **Launch support:** one motion poster and a 30-day growth plan.
- **Protected value:** the verified $50 is credited toward either larger plan.

### Complete Website Revamp — $200

- **Strategy:** applicable Homepage Reveal findings and direction.
- **Website:** up to five agreed responsive pages with accessibility and performance work.
- **Campaign suite:** five motion posters, ten still posters, three business-card variations, and two brochure variations.
- **Quality proof:** before-and-after evidence and one retest summary.
- **Protected value:** upgrade to Cinematic for the remaining $50.

### Cinematic Scroll Site — $250

- **Everything in Complete:** the complete responsive website and creative suite.
- **Cinematic direction:** one coordinated three- or four-scene visual story selected with the customer.
- **Scroll production:** a motion-led narrative integrated into the website rather than supplied as an isolated effect.
- **Inclusive delivery:** mobile, static, failed-media, and reduced-motion fallbacks.
- **Private collaboration:** ranked concepts, special instructions, progress, and final delivery remain together in the customer workspace.

No copy may imply unlimited pages, unlimited revisions, revenue guarantees, or unbounded cinematic production.

## Premium review and payment experience

The final order step becomes a commission folio with:

- the selected plan and one-time amount as the visual anchor;
- grouped value sections matching the plan presentation above;
- a concise timeline covering secure payment, visual direction, production, review, and private delivery;
- the customer’s brief kept compact and secondary;
- a direct link to the working portfolio in a new tab;
- clear private-storage and Stripe-hosted-payment assurances;
- one unmistakable “Continue to Stripe” action.

Stripe Checkout remains hosted at `checkout.stripe.com`. No card fields or Stripe secrets enter the AccessRevamp browser bundle.

## Confirmed Stripe root cause and activation

The live `/api/payment-health` endpoint currently returns HTTP `503` with `{"ready":false}`.

Read-only production inspection confirmed:

- `payment_runtime_settings.checkout_enabled = false`;
- `expected_livemode = true`;
- `live_payment_approved = true`;
- `configuration_verified_at` is older than the 24-hour readiness window;
- all six required live catalog transitions are active and have server-side Stripe Price IDs;
- all required Stripe and Supabase Worker secret bindings are present;
- a successful webhook timestamp is recorded;
- zero unresolved payment incidents and zero unresolved critical payment incidents exist.

The activation sequence is:

1. verify the deployed Worker still contains every required secret binding without exposing values;
2. verify the six live price transitions and approved cents;
3. verify no unresolved payment incident exists;
4. refresh the configuration verification timestamp and enable checkout in one guarded database update;
5. require `/api/payment-health` to return HTTP `200` and exactly `{"ready":true}`;
6. create one authenticated Stripe Checkout Session without completing a charge;
7. confirm the returned destination is `https://checkout.stripe.com`;
8. retain signed-webhook fulfillment as the only payment authority.

If any activation gate fails, checkout remains disabled and the blocker is reported without exposing configuration details.

## Showcase performance design

The current comparison seeks two 1024×576 MP4 files at once and presents up to 18 seek updates per second. All six clips are eight seconds at 24 fps, and the largest are approximately 6.6 MB. This can exceed the browser decoder’s ability to settle rapid seeks, which appears as delayed jumps during fast scrolling.

The revised pipeline will:

- retain one active comparison chapter and preload only the neighboring chapter;
- ship scrub-ready 720-pixel-wide derivatives for the homepage comparison;
- preserve 24 fps, fast-start metadata, short keyframe spacing, 4:2:0 pixel format, and poster fallbacks;
- coalesce scroll input to the latest target;
- use approximate fast seeking for large jumps where the browser supports it, followed by an exact settled frame;
- pace presentation through animation frames without queuing overlapping decodes;
- pause and release inactive media;
- preserve exact 0% and 100% boundary frames;
- keep the range input and touch controls synchronized;
- show readable posters when video cannot load or motion is reduced.

The visual quality must remain suitable for the rendered panel size on desktop and mobile. Source masters remain unchanged.

## Responsive and accessible behavior

- The three-stage journey stacks cleanly on mobile and retains its sequence.
- Plan groups remain readable at 320 pixels without horizontal overflow.
- Selected-state meaning is conveyed by text and control state, not color alone.
- Keyboard focus remains visible.
- Reduced-motion mode removes orbit, aura, light-sweep, and smoothing animation while preserving content.
- Forced-color mode uses system borders and outlines.
- Showcase videos retain poster and failed-media fallbacks.

## Verification

- Test-first content contracts for the three customer stages and six plain-language production steps.
- Test-first plan-value grouping and plan-specific premium visual states.
- Test-first premium review structure and Stripe action.
- Unit coverage for payment readiness, unavailable state, malformed response, and network failure.
- Browser coverage for desktop and mobile plan selection, review layout, fast forward/reverse showcase scrolling, and absence of horizontal overflow.
- Media inspection proving the deployed scrub derivatives meet width, codec, pixel-format, frame-rate, keyframe, size, and fast-start requirements.
- Full static checks, all unit tests, production build, dependency audit, and deployment checks.
- Production verification that `/api/payment-health` returns HTTP `200`, the deployed bundles contain the approved presentation, and an authenticated Checkout Session resolves only to Stripe-hosted Checkout.
