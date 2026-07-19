import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('the homepage contains the complete approved audit-lens story', async () => {
  const home = await read('src/pages/home.js');
  for (const phrase of [
    'AccessRevamp transforms storefronts',
    'One clearer growth system',
    'Choose the transformation you need',
    'Keep every verified dollar',
    'Transformation studies',
    'Eleven review lenses',
    'Before',
    'Direction',
    'Observe',
    'Verify',
    'Prioritize',
    'Design',
    'Build',
    'Retest',
    'Verdant Cut Co.',
    'Ember & Jar',
    'Clearline Plumbing',
    'one subtle AI-assisted motion poster',
    'five motion posters',
    'Interaction references',
    'Bring one public website',
  ]) {
    assert.match(home, new RegExp(escapeRegExp(phrase), 'i'));
  }
  assert.match(home, /Object\.values\(plans\)/);
  for (const route of [
    '/portfolio/verdant-cut',
    '/portfolio/ember-and-jar',
    '/portfolio/clearline-plumbing',
  ]) {
    assert.match(home, new RegExp(route.replaceAll('/', '\\/')));
  }
  const [demoShell, lensData] = await Promise.all([read('src/demos/shared/demo-shell.js'), read('src/data/lenses.js')]);
  assert.match(demoShell, /Original working demo — not a client engagement\./);
  for (const category of ['Accessibility', 'Usability', 'Mobile', 'Performance', 'Content', 'SEO \/ local discovery', 'Conversion', 'Monetization', 'Analytics', 'Social growth', 'Security hygiene']) {
    assert.match(lensData, new RegExp(category, 'i'));
  }
});

test('the portfolio contains seven clearly disclosed original fictional concepts', async () => {
  const portfolio = await read('src/data/portfolio.js');
  for (const title of ['Northline Goods', 'Morrow Studio', 'Fable & Finch', 'Sip / Savor', 'Move Well', 'Form / Function', 'Aether One']) {
    assert.match(portfolio, new RegExp(title.replace(/[&/]/g, '\\$&')));
  }
  assert.equal((portfolio.match(/fictionalConcept:\s*true/g) || []).length, 7);
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
