import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

test('the editorial homepage contains the approved story and conversion sequence', async () => {
  const home = await read('src/pages/home.js');
  for (const phrase of ['Selected work', 'Find the friction', 'Clarify the offer', 'Build something stronger', 'See the sample report', 'Start a revamp']) {
    assert.match(home, new RegExp(phrase, 'i'));
  }
  assert.match(home, /Object\.values\(plans\)/);
  assert.match(home, /workCard/);
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

