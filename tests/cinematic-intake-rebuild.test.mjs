import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('homepage opens with the registered pale-to-gold Atlas reveal', async () => {
  const [home, css, interactions] = await Promise.all([
    read('src/pages/home.js'),
    read('src/styles/cinematic-renaissance.css'),
    read('src/pages/home-interactions.js'),
  ]);

  assert.match(home, /class="reveal-hero"/);
  assert.match(home, /accessrevamp-atlas-base-desktop\.webp/);
  assert.match(home, /accessrevamp-atlas-gold-desktop\.webp/);
  assert.match(home, /Reveal transformation/);
  assert.match(css, /circle 260px at var\(--reveal-x\) var\(--reveal-y\)/);
  assert.match(css, /rgba\(255,255,255,\.12\) 88%/);
  assert.match(interactions, /requestAnimationFrame/);
  assert.match(interactions, /setPointerCapture/);
  assert.match(interactions, /visibilitychange/);
});

test('paid plans expose the approved creative production bundle and upgrade path', async () => {
  const [catalog, migration, css] = await Promise.all([
    read('src/config/tier-catalog.js'),
    read('supabase/migrations/20260719064036_expand_creative_bundle.sql'),
    read('src/styles/cinematic-renaissance.css'),
  ]);
  assert.match(catalog, /One subtle AI-assisted motion poster ad/);
  assert.match(catalog, /15 Canva-built animated poster ads total across the package/);
  assert.doesNotMatch(catalog, /still poster/i);
  assert.match(catalog, /Three business card variations/);
  assert.match(catalog, /Two brochure variations/);
  assert.match(catalog, /Upgrade to the \$200 plan later for only \$150/);
  assert.match(catalog, /Upgrade to the \$250 Cinematic plan later for only \$50/);
  assert.match(catalog, /Upgrade from the \$200 plan for \$50/);
  assert.match(migration, /motion_poster/);
  assert.match(migration, /business_card/);
  assert.match(migration, /brochure/);
  assert.match(migration, /complete_revamp/);
  assert.match(migration, /cinematic_scroll/);
  assert.match(css, /\.services-renaissance \.pricing-grid\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test('complete and cinematic customers receive a mobile-first project brief', async () => {
  const [main, page, service, api, worker, storageMigration] = await Promise.all([
    read('src/main.js'),
    read('src/pages/project-intake.js'),
    read('src/services/project-intake.js'),
    read('netlify/functions/project-intake.mjs'),
    read('worker/index.ts'),
    read('supabase/migrations/20260719070000_project_intake_storage.sql'),
  ]);

  assert.match(main, /'\/project-intake'/);
  assert.match(page, /name="pages"/);
  assert.match(page, /name="styleNotes"/);
  assert.match(page, /name="referenceUrls"/);
  assert.match(page, /type="file"[^>]+accept="image\/\*"[^>]+multiple/);
  assert.match(page, /data-upload-dropzone/);
  assert.match(page, /data-style-reference/);
  assert.match(service, /FormData/);
  assert.match(service, /\/api\/project-intake/);
  assert.match(api, /requireConfirmedUser/);
  assert.match(api, /project-intake-assets/);
  assert.match(api, /complete_revamp/);
  assert.match(api, /cinematic_scroll/);
  assert.match(worker, /\/api\/project-intake/);
  assert.match(storageMigration, /project-intake-assets/);
  assert.match(storageMigration, /public, file_size_limit, allowed_mime_types/);
});

test('cinematic references are separated from portfolio work and credited', async () => {
  const [home, references] = await Promise.all([
    read('src/pages/home.js'),
    import('../src/data/cinematic-references.js'),
  ]);

  assert.equal(references.cinematicReferences.length, 5);
  for (const reference of references.cinematicReferences) {
    assert.ok(reference.creator);
    assert.match(reference.url, /^https:\/\//);
    assert.ok(reference.technique);
  }
  assert.match(home, /Interaction references/);
  assert.match(home, /not by AccessRevamp/);
});

test('outreach schedule records the requested ramp but enforces the safety cap', async () => {
  const schedule = await import('../src/config/outreach-schedule.js');
  assert.equal(schedule.requestedDailyTarget(1), 15);
  assert.equal(schedule.requestedDailyTarget(4), 15);
  assert.equal(schedule.requestedDailyTarget(5), 20);
  assert.equal(schedule.requestedDailyTarget(14), 20);
  assert.equal(schedule.requestedDailyTarget(15), 22);
  assert.equal(schedule.enforcedDailyDraftLimit(15), 20);
  assert.equal(schedule.OUTREACH_HARD_CAP, 20);
  assert.equal(schedule.SENDING_ENABLED, false);
});
