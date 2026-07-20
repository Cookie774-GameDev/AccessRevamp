import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [main, portfolio, home, work, styles, demoShell] = await Promise.all([
  readFile('src/main.js', 'utf8'),
  readFile('src/data/portfolio.js', 'utf8'),
  readFile('src/pages/home.js', 'utf8'),
  readFile('src/pages/work.js', 'utf8'),
  readFile('src/styles/pages.css', 'utf8'),
  readFile('src/demos/shared/demo-shell.js', 'utf8'),
]);

test('the remaining portfolio is loaded as part of the production website', () => {
  assert.match(main, /'\/work': workPage/);
  assert.match(main, /'\/work\/:slug'/);
  assert.match(work, /portfolioItems/);
  for (const route of [
    '/portfolio/verdant-cut',
    '/portfolio/ember-and-jar',
    '/portfolio/clearline-plumbing',
  ]) {
    const routePattern = new RegExp(route.replaceAll('/', '\\/'));
    assert.doesNotMatch(home, routePattern);
    assert.doesNotMatch(work, routePattern);
  }
});

test('the portfolio contains three homepage concepts and three poster concepts', () => {
  assert.equal((portfolio.match(/kind: 'homepage'/g) || []).length, 3);
  assert.equal((portfolio.match(/kind: 'campaign'/g) || []).length, 3);
  assert.equal((portfolio.match(/kind: 'cinematic'/g) || []).length, 1);
  assert.match(portfolio, /Northline Goods/);
  assert.match(portfolio, /Morrow Studio/);
  assert.match(portfolio, /Fable & Finch/);
  assert.match(portfolio, /Sip \/ Savor/);
  assert.match(portfolio, /Move Well/);
  assert.match(portfolio, /Form \/ Function/);
});

test('portfolio work is clearly disclosed as fictional concept work', () => {
  assert.equal((portfolio.match(/fictionalConcept:\s*true/g) || []).length, 7);
  assert.match(demoShell, /Original working demo — not a client engagement\./);
  assert.match(work, /not client endorsements/i);
  assert.doesNotMatch(`${home}\n${work}`, /trusted by|client results|we increased|revenue lift/i);
});

test('portfolio layouts collapse safely for tablets and mobile screens', () => {
  assert.match(styles, /\.work-grid\s*>\s*\[data-work-kind\][\s\S]*grid-column:\s*span 6/);
  assert.match(styles, /\.work-grid\s*>\s*\[data-work-kind\]:nth-child\(3n \+ 1\)[\s\S]*grid-column:\s*span 7/);
  assert.match(styles, /@media \(max-width: 1000px\)/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /\.work-grid[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /\.work-card__art[\s\S]*min-height: 21rem/);
});
