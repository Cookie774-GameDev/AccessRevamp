import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [index, portfolio, styles] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('src/portfolio.js', 'utf8'),
  readFile('src/portfolio.css', 'utf8'),
]);

test('the portfolio is loaded as part of the production website', () => {
  assert.match(index, /src\/portfolio\.js/);
  assert.match(portfolio, /location\.pathname === '\/portfolio'/);
  assert.match(portfolio, /data-portfolio-home/);
  assert.match(portfolio, /AccessRevamp portfolio/);
});

test('the portfolio contains three homepage concepts and three poster concepts', () => {
  assert.equal((portfolio.match(/category: '.*homepage'/g) || []).length, 3);
  assert.equal((portfolio.match(/category: '.*campaign'|category: 'Home-goods product drop'/g) || []).length, 3);
  assert.equal((portfolio.match(/canvaUrl: 'https:\/\/www\.canva\.com\/d\//g) || []).length, 6);
  assert.match(portfolio, /Northline Goods/);
  assert.match(portfolio, /Morrow Studio/);
  assert.match(portfolio, /Fable & Finch/);
  assert.match(portfolio, /Sip \/ Savor/);
  assert.match(portfolio, /Move Well/);
  assert.match(portfolio, /Form \/ Function/);
});

test('portfolio work is clearly disclosed as fictional concept work', () => {
  assert.match(portfolio, /original, fictional concept work/i);
  assert.match(portfolio, /not client endorsements/i);
  assert.match(portfolio, /not live client sites/i);
  assert.doesNotMatch(portfolio, /trusted by|client results|we increased|revenue lift/i);
});

test('portfolio layouts collapse safely for tablets and mobile screens', () => {
  assert.match(styles, /@media \(max-width: 1080px\)/);
  assert.match(styles, /@media \(max-width: 980px\)/);
  assert.match(styles, /@media \(max-width: 720px\)/);
  assert.match(styles, /portfolio-grid--home,[\s\S]*portfolio-grid--posters,[\s\S]*portfolio-process[\s\S]*grid-template-columns: 1fr/);
  assert.match(styles, /concept-site__nav > div[\s\S]*display: none/);
});
