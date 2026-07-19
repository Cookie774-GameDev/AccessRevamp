# AccessRevamp Master Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Integrate the supplied static website concepts and six paired scroll-controlled videos into the production homepage, complete the customer order wizard, verify the site, and republish it.

**Architecture:** Preserve the existing Vite/Vinext application, route system, centralized tier catalog, Supabase authorization boundary, Stripe test checkout, and Sites deployment. Add focused homepage media data, a scroll/touch comparison controller, a locally persistent public order wizard that hands verified users to server-authoritative checkout, and responsive section styles. Supplied media remains presentation-only while real controls retain semantic button and form behavior.

**Tech Stack:** Native ES modules, Vite/Vinext, semantic HTML, CSS, Pointer Events, IntersectionObserver, Supabase, Stripe Checkout test mode, Node test runner, Playwright, Sites.

## Global Constraints

- Preserve AccessRevamp’s cream, coral, mint, yellow, white, and near-black identity.
- Canonical prices remain $0, $50, $200, and $250 with verified cumulative credit.
- Keep supplied screenshots uncropped and all six videos paused, paired, scrubbed from metadata durations, and non-clickable.
- Keep uploads private and server-authorized; never expose secrets or grant entitlement from redirects.
- Outreach sending remains disabled under the repository contract.

### Task 1: Import and document supplied media

- [ ] Copy the three supplied PNG source masters into documentation storage.
- [ ] Create optimized full-composition WebP delivery images.
- [ ] Copy all six 1080p MP4 files with stable public names.
- [ ] Generate a representative WebP poster from each video.
- [ ] Record local filenames, origin, dimensions, and concept status in asset documentation.

### Task 2: Build homepage gallery and scroll comparison

- [ ] Add a data module defining the three images and three semantic video pairings.
- [ ] Write contract tests for headings, exact pairings, media attributes, and progress controls.
- [ ] Render the trust strip, exact “Example Websites” gallery, and three comparison chapters.
- [ ] Implement shared progress, bidirectional scroll, direct touch drag, keyboard/range fallback, lazy preparation, failure states, cleanup, and reduced-motion behavior.
- [ ] Add responsive styling for desktop side-by-side and mobile stacked 16:9 stages.

### Task 3: Complete the multi-step order wizard

- [ ] Write tests for required fields, plan selection, local persistence, plan-specific brief fields, upload validation, review summary, and checkout handoff.
- [ ] Build five accessible steps using the existing tier catalog.
- [ ] Support photos, video, documents, text, and ZIP references with removable file summaries.
- [ ] Persist non-file draft fields locally and preserve server-authoritative Stripe checkout.
- [ ] Link the public wizard to authenticated private intake for durable pre-payment uploads.

### Task 4: Verify responsive, interaction, and production behavior

- [ ] Run focused unit tests and repair failures.
- [ ] Run lint, complete unit tests, asset verification, production build, budget, and secret checks.
- [ ] Run Chromium end-to-end tests and critical Firefox/WebKit interaction checks.
- [ ] Check required viewport widths for overflow, media cropping, focus, touch, reverse scrub, and console errors.

### Task 5: Publish and report operational limitations

- [ ] Publish the exact verified tree through the existing Sites project.
- [ ] Verify the live homepage and leave it open.
- [ ] Attempt the connected Drive target; if prospect verification cannot be completed without fabrication or tool access, report the exact verified count and do not pad records.
- [ ] Report Stripe, Supabase, storage, mail, Drive, and outreach status truthfully.
