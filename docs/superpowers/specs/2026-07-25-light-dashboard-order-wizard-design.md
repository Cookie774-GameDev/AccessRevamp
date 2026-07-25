# Light Dashboard and Order Wizard Refinement

## Approved direction

AccessRevamp’s private customer area becomes a compact, cozy-light application rather than a marketing page. Typography uses ordinary dashboard scale, the top-level navigation has Overview, Projects, and Settings tabs, and each selected project has simple sub-tabs for progress, brief, designs, requests, and files. Warm ivory surfaces, soft amber accents, restrained coral actions, and charcoal text preserve the AccessRevamp identity without using the dark public-site treatment.

Settings shows the confirmed account identity and routes password changes through the existing secure recovery ceremony: email request, six-to-eight-digit verification code, then a new password. It must never expose credentials or create a second account.

## Order wizard behavior

The Brief step requires only:

- Main website goal
- Requested pages and sections
- Required features and integrations

Preferred style and colors, brand copy/content status, desired launch date, reference URLs, specific requests, and reference files are optional. Cinematic scene count remains required only for the cinematic plan.

Validation identifies the exact incomplete field, scrolls it into view, and uses inline status copy. A nonempty required text field is enough; hidden minimum-length rules must not make a visibly completed field fail.

Reference files remain local while the customer edits. After the customer accepts the terms and clicks the Stripe continuation, the authenticated order-draft request uploads the selected files to the private `order-draft-assets` Supabase bucket before Stripe is opened. Failed draft persistence prevents payment navigation.

## Visual details

- Dashboard heading stays within a 32–40px desktop range and 28–34px mobile range.
- Dashboard content uses a light application shell with compact cards and tab controls.
- Order-wizard headings are reduced and spacing is tightened.
- The selected Complete Website Revamp plan name uses a yellow-orange color in default, selected, and hover states.
- Plan perks become compact check rows instead of a loose bullet-heavy block.
- Mobile tabs scroll horizontally when necessary and every form panel remains one column without horizontal overflow.

## Verification

Regression tests cover required/optional Brief fields, exact invalid-field reporting, authenticated multipart file handoff before Checkout, dashboard tabs/settings, and the Complete-plan contrast contract. Desktop and mobile browser QA must confirm layout, focus visibility, and no horizontal overflow.
