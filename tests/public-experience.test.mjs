import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('the homepage keeps the requested production story without the three removed sections', async () => {
  const home = await read('src/pages/home.js');
  for (const phrase of [
    'AccessRevamp transforms storefronts',
    'A guided customer journey',
    'Your website should feel like a clear conversation—not a maze',
    'Tell us what you need',
    'Choose your plan and designs',
    'Receive, review, and launch',
    'You receive',
    'Choose the transformation you need',
    'Keep every verified dollar',
    'Transformation studies',
    'Before',
    'Direction',
    'Review your current site',
    'Agree on the goal',
    'Choose the right plan',
    'Pick your direction',
    'Build and test',
    'Receive and launch',
    'You can see what happens next at every stage',
    'Bring one public website',
  ]) {
    assert.match(home, new RegExp(escapeRegExp(phrase), 'i'));
  }
  assert.match(home, /Object\.values\(plans\)/);
  assert.doesNotMatch(home, /data-lens-grid|creative-bundle-section|class="section demo-section"/);
  for (const route of [
    '/portfolio/verdant-cut',
    '/portfolio/ember-and-jar',
    '/portfolio/clearline-plumbing',
  ]) {
    assert.doesNotMatch(home, new RegExp(route.replaceAll('/', '\\/')));
  }
});

test('the portfolio contains the supplied films and the three homepage website comparisons', async () => {
  const [portfolio, work, media] = await Promise.all([
    read('src/data/portfolio.js'),
    read('src/pages/work.js'),
    read('src/data/showcase-media.js'),
  ]);
  for (const title of ['Japan Through Time', 'The Moonfold Ronin']) {
    assert.match(portfolio, new RegExp(escapeRegExp(title)));
  }
  for (const title of ['Verdant Edge Lawn Care', 'Northframe Studio', 'Olympus Academy']) {
    assert.match(media, new RegExp(escapeRegExp(title)));
  }
  assert.match(work, /showcasePairs\.map\(showcaseChapter\)/);
  assert.doesNotMatch(portfolio, /fictionalConcept/);
});

test('public routes are explicit and cinematic behavior has lifecycle cleanup', async () => {
  const [main, cinematic] = await Promise.all([
    read('src/main.js'),
    read('src/cinematic-scroll.js'),
  ]);
  for (const route of ['/work', '/work/:slug', '/services', '/process', '/pricing', '/sample-report', '/methodology', '/cinematic-scroll']) {
    assert.match(main, new RegExp(`'${route.replace('/', '\\/')}'`));
  }
  assert.match(cinematic, /setupCinematicExperience/);
  assert.match(cinematic, /removeEventListener/);
  assert.match(cinematic, /prefers-reduced-motion/);
  assert.doesNotMatch(cinematic, /MutationObserver/);
});
