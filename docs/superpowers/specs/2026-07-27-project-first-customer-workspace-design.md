# Project-First Customer Workspace Design

## Outcome

The private AccessRevamp dashboard opens directly into the customer’s selected project. It removes the generic entitlement overview, makes the current customer action unmistakable, presents progress as truthful workflow checkpoints, and turns design ranking into a full-screen visual decision flow.

## Workspace structure

- Keep two account-level tabs: `Projects` and `Settings`.
- Open `Projects` by default and use nearly the full viewport width below the public header.
- Keep the project rail compact and give the selected project the remaining width.
- Put the selected project’s name, status, current action, milestone rail, and `Audit` / `Website` tabs above its content.
- Do not describe a private evaluation as a paid entitlement or paid order.

## Progress

Progress is derived from the furthest verified workflow signal: the project status, completed required tasks, or a published progress update. An older published percentage cannot move a project behind its current workflow stage.

The visible rail uses plan-aware checkpoints:

- Homepage Reveal: Intake, Audit, Directions, Client review, Complete.
- Complete Revamp and Cinematic Scroll: Intake, Audit, Directions, Client review, Website build, Delivery.

The current checkpoint is named in plain language. The rail may animate gently, but it is static under reduced motion.

## Website decision flow

The Website panel uses a prominent action card and a full-width `Start design review` control.

The full-screen selector:

- uses a near-black canvas and keeps the AccessRevamp gold/coral signal colors;
- shows uncropped homepage previews in larger cards;
- provides an explicit `Enlarge preview` action that does not rank the design;
- provides a separate rank action for first, second, and third choice;
- provides Back after the first choice;
- displays selected choices as visual cards throughout the flow;
- shows first, second, and third choices with images on the final confirmation screen;
- accepts optional special instructions before one secure submission;
- traps the decision in a modal surface without scrolling the page behind it.

All selected option IDs, their order, revision round, and notes continue through the owner-scoped Supabase feedback RPC. The UI does not create a second client-side source of truth.

## Audit presentation

- Use larger group headings and restrained inline SVG category marks rather than decorative emoji.
- Translate category labels and actions into plain language.
- Keep severity, confidence, evidence, and recommendation visibly separate.
- Show the exact cited page title and URL when available.
- Product findings link to the exact product page; policy findings link to the exact policy page; external guidance links to its official source.
- Group the existing verified findings into practical customer sections covering conversion, usability, content/claims, search visibility, performance, passive security, and modern advertising.
- Never invent a finding, sales result, best seller, ranking result, or security vulnerability.

## Poster cards

Motion posters remain private, signed videos. Their cards use compact titles, a short supporting description, and a direct preview action. Long production notes are not rendered as oversized headings.

## Responsive and accessibility behavior

- Desktop uses the full customer canvas; tablet collapses the rail above the project; mobile uses a horizontal project strip.
- Design previews remain large enough to inspect on mobile and enlarge into a dedicated overlay.
- Keyboard focus, Escape-to-close, native buttons, visible labels, 44-pixel targets, reduced motion, 320-pixel reflow, and 200% zoom remain supported.

## Process documentation

Customer audit, design, and delivery instructions must require exact source URLs, durable project feedback, and plan-aware workflow checkpoints. The old browser-chat 9 MB file limit is not a Codex operating constraint and must be removed from the agent-system documentation; provider-specific upload limits remain enforced by code and storage configuration.

## Verification

- Unit tests cover stage-aware progress, project-first navigation, enlarged previews, Back navigation, visual final confirmation, exact citation links, and compact poster copy.
- Focused customer workspace tests pass before the full quality suite.
- Desktop and mobile browser checks verify the live structure, modal flow, responsive preview sizing, reduced motion, and no console errors.

