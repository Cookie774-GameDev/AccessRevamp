import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [main, portfolio, home, work, styles] = await Promise.all([
  readFile('src/main.js', 'utf8'),
  readFile('src/data/portfolio.js', 'utf8'),
  readFile('src/pages/home.js', 'utf8'),
  readFile('src/pages/work.js', 'utf8'),
  readFile('src/styles/working-portfolio.css', 'utf8'),
]);

test('the working portfolio is loaded as part of the production website', () => {
  assert.match(main, /'\/portfolio': workPage/);
  assert.match(main, /setupShowcaseComparisons\(app\)/);
  assert.match(work, /portfolioItems/);
  assert.match(work, /showcasePairs\.map\(showcaseChapter\)/);
  assert.match(home, /showcasePairs\.map\(showcaseChapter\)/);
});

test('the portfolio contains the two supplied scroll films and no retired concept catalog', () => {
  assert.equal((portfolio.match(/Object\.freeze\(\{/g) || []).length, 2);
  assert.match(portfolio, /Japan Through Time/);
  assert.match(portfolio, /The Moonfold Ronin/);
  for (const retired of ['Northline Goods', 'Morrow Studio', 'Fable & Finch', 'Sip / Savor', 'Move Well', 'Form / Function', 'Aether One']) {
    assert.doesNotMatch(portfolio, new RegExp(retired.replace('/', '\\/')));
  }
});

test('portfolio work remains honestly disclosed as original demonstration work', () => {
  assert.match(work, /Original demonstrations/);
  assert.match(work, /not client endorsements or measured outcome claims/i);
  assert.doesNotMatch(`${home}\n${work}`, /trusted by|client results|we increased|revenue lift/i);
});

test('working portfolio layouts collapse safely for tablets and mobile screens', () => {
  assert.match(styles, /\.portfolio-film-grid\{display:grid;grid-template-columns:repeat\(2/);
  assert.match(styles, /@media\(max-width:900px\)/);
  assert.match(styles, /\.portfolio-film-grid\{grid-template-columns:1fr\}/);
  assert.match(styles, /@media\(max-width:600px\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});
