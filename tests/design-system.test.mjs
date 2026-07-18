import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

test('the approved diagnostic-lab palette is centralized exactly', async () => {
  const tokens = await read('src/styles/tokens.css');
  for (const [name, value] of [
    ['ink', '#0b1020'],
    ['near-black', '#05070c'],
    ['bone', '#f6f1e8'],
    ['white', '#ffffff'],
    ['signal-coral', '#ff5a3d'],
    ['mint', '#a7f3d0'],
    ['electric-yellow', '#f7d154'],
    ['slate', '#6b7280'],
  ]) {
    assert.match(tokens, new RegExp(`--${name}:\\s*${value}`, 'i'), `missing exact ${name} token`);
  }
  assert.doesNotMatch(tokens, /#3c56d9|#ffbe3d|#f7603a/i);
});

test('the shared shell uses the AR monogram and approved navigation', async () => {
  const [brand, shell, navigation] = await Promise.all([
    read('src/components/brand.js'),
    read('src/components/shell.js'),
    read('src/data/navigation.js'),
  ]);
  assert.match(brand, /<svg/);
  assert.match(brand, /brand-monogram/);
  assert.match(brand, /AccessRevamp home/);
  for (const label of ['Portfolio', 'Free snapshot', 'Process', 'Pricing', 'Contact']) {
    assert.match(navigation, new RegExp(`'${label}'`));
  }
  assert.match(shell, /Get the \$50 Homepage Reveal/);
  assert.match(shell, /Sign in/);
});

test('the visual system covers focus, responsive layout, and reduced motion', async () => {
  const [base, components, pages, motion] = await Promise.all([
    read('src/styles/base.css'),
    read('src/styles/components.css'),
    read('src/styles/pages.css'),
    read('src/styles/motion.css'),
  ]);
  assert.match(base, /:focus-visible/);
  assert.match(components, /\.site-header/);
  assert.match(pages, /@media\s*\(max-width:\s*760px\)/);
  assert.match(motion, /prefers-reduced-motion:\s*reduce/);
});
