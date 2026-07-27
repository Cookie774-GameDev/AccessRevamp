# Creative Review Command Center

## Outcome

Give the AccessRevamp owner one private operator workspace for reviewing every
homepage, poster, cinematic scene, and page reference before it can reach a
customer. The workspace is project-isolated, versioned, auditable, and connected
to the existing durable workflow-task system.

## Users and authority

- Active `accessrevamp_operators` may read and act in the command center.
- Design, customer, and website agents may submit versions only through trusted
  server/service-role workers. They cannot approve their own work.
- Customers see only options that separately pass factual-asset review, copy
  review, rights review, design approval, and delivery approval.
- A design approval means “the creative direction is acceptable.” It never
  means “send this to the customer.”

## Data model

Each `project_design_options` row is one immutable creative version. Revisions
create a new row linked to the prior version; they never overwrite evidence.

Add:

- version lineage, submitting agent, and submission note to design options;
- append-only operator feedback with exact option/version, note, author, and
  routing result;
- append-only review events for submission, changes requested, design approval,
  delivery approval, supersession, and quarantine;
- separate design-review and delivery-review fields;
- a durable revision task addressed to the option's assigned agent whenever the
  owner requests changes.

The existing `project_source_assets` and
`project_design_option_assets` tables remain the factual-asset authority.

## State machine

`draft → human_review → changes_requested → human_review`

`human_review → design_approved → delivery_approved → customer_ready`

Any source-manifest, rights, copy, or fidelity invalidation moves the option
back to human review and clears both approvals. Delivery approval is rejected
unless design approval and every existing fidelity gate are current.

## Operator experience

The existing `/operator` page gains a “Creative review” workspace:

- project rail with customer, URL, plan, workflow stage, and pending count;
- filter chips for homepage, poster, cinematic, page reference, and status;
- large review stage with responsive preview, source-asset evidence, version
  lineage, submitting agent, and exact customer/project identity;
- critique composer with a required actionable note and “request changes”;
- separate “approve design” and “approve for customer delivery” actions;
- event timeline showing who did what and when;
- no automatic customer email or dashboard publication from review actions.

The visual direction is a private, dark review room nested inside the existing
AccessRevamp operator shell: restrained warm-gold focus, coral action accents,
high contrast, clear keyboard focus, and reduced-motion-safe transitions.

## Postal identity

Record `Creek Hollow Ave Zachary` as an owner-supplied candidate, not a verified
postal address. Activation requires structured street number, street, city,
state, and ZIP fields. The current value is missing a street number, state, and
ZIP, so outreach stays fail-closed.

## Agent prompt contract

Prompts follow current GPT-5.6 guidance:

- state role, outcome, success criteria, evidence, constraints, tools, output,
  and stop rules once;
- preserve exact user values and source evidence;
- expose only task-relevant tools;
- separate safe local autonomy from external delivery/spending authority;
- require representative validation before completion;
- keep project identity and current version explicit after every handoff.

Customer dossiers and design documents must record products/services, exact
copy, fonts, UI patterns, brand identity, colors and relationships, imagery,
preferences, dislikes, and approved deviations with sources.

## Security and failure behavior

- Same-origin, confirmed operator, bounded JSON, strict enums, and project
  existence checks on every mutation.
- Service credentials never enter browser code.
- RLS remains enabled; browser roles receive no direct mutation rights.
- Feedback creation and task routing occur atomically in a security-definer
  function with a fixed safe search path and revoked public execution.
- Duplicate requests use idempotency keys.
- Missing workflow or assigned agent records the feedback but reports routing
  as blocked; it never silently loses the critique.
- Customer delivery requires a second explicit action and is never part of the
  automated test.

## Acceptance evidence

1. V1 appears in the command center for the isolated UrBeauty test project.
2. An operator critique creates one feedback row and one durable revision task.
3. V2 links to V1 and appears with the critique resolved.
4. V2 can be design-approved while remaining invisible to the customer.
5. No delivery record, customer-ready status, email, or external send occurs.
6. Targeted tests, full checks, security scan, build, and browser interaction
   pass.

