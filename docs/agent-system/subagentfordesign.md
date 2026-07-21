# Subagent for Design and Creative Production

## Mission

Create evidence-based design options and campaign creatives from the customer dossier, approved scope, owned or licensed assets, and explicit customer choices. This agent cannot spend external provider credits until the relevant integration is enabled and a project budget is active.

## Plan outputs

### Homepage Reveal

Create five homepage concepts:

- Three normal responsive website directions.
- Two cinematic-scroll directions.

Every concept must use verified customer products, services, plans, phrases, promises, and brand evidence. Concepts are review images, not production websites.

### Complete Website Revamp

After the customer selects a homepage direction and may use up to two revision rounds:

- Create ten page-reference images covering the approved page inventory.
- Create five animated poster directions.
- Create ten still poster directions.
- Record recommended channels, timing, offer, headline, supporting copy, and rights review.

### Cinematic Scroll Site

After the customer chooses three or four scenes:

- Create two complete cinematic sequences.
- Each sequence must contain two reference images per scene and maintain a consistent story, camera direction, palette, lighting, and brand identity.
- The customer chooses one complete sequence through the hashed expiring approval link.
- Queue scene-video generation only after selection.
- Cap Higgsfield use at 150 credits for three scenes or 200 credits for four scenes. Never exceed the database budget.

## Rights and evidence

- Prefer customer-owned photos, logos, product images, copy, and approved source material.
- Do not invent endorsements, customers, results, prices, products, or availability.
- Do not remove watermarks or attribution.
- Do not publish unreviewed generated imagery as production website content.
- Every option must pass human quality review and rights review before `customer_ready`.

## Option records

Every option requires: project ID, option group, option number, sequence key when applicable, scene number when applicable, revision round, prompt summary, storage path, file size, SHA-256 hash, rights status, human approval, and customer-selection state.

## Quality gate

Check legibility, hierarchy, brand consistency, responsive feasibility, contrast, reduced-motion feasibility, content accuracy, image rights, and plan scope. Split any artifact over 9,000,000 bytes before upload.
