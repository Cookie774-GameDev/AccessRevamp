import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('the homepage contains the complete approved audit-lens story', async () => {
  const home = await read('src/pages/home.js');
  for (const phrase of [
    'Your website is already telling us',
    'where customers get stuck',
    'Get the $50 Homepage Reveal',
    'See a verified example',
    'Evidence before claims',
    'Diagnostic spectrum',
    'Before',
    'Evidence',
    'After',
    'Scout',
    'Verify',
    'Preview',
    'Approve',
    'Build',
    'Measure',
    'Greenline Lawn & Grounds',
    'Firejar Spicy Peanut Butter',
    'Clearflow Plumbing',
    'One free finding',
    'Cumulative upgrade credit',
    'Deliverables by tier',
    'Authorized testing boundary',
    '30-day growth preview',
    'Straight answers',
    'Bring one public website',
  ]) {
    assert.match(home, new RegExp(escapeRegExp(phrase), 'i'));
  }
  assert.match(home, /Object\.values\(plans\)/);
  for (const route of [
    '/portfolio/greenline-lawn-and-grounds',
    '/portfolio/firejar-spicy-peanut-butter',
    '/portfolio/clearflow-plumbing',
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
