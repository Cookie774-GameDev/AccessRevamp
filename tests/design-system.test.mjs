import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

test('the approved ultramarine and sun editorial palette is centralized', async () => {
  const tokens = await read('src/styles/tokens.css');
  assert.match(tokens, /--canvas:\s*#f6f2df/i);
  assert.match(tokens, /--surface:\s*#fffdf5/i);
  assert.match(tokens, /--ink:\s*#17243b/i);
  assert.match(tokens, /--ultramarine:\s*#3c56d9/i);
  assert.match(tokens, /--sun:\s*#ffbe3d/i);
  assert.match(tokens, /--persimmon:\s*#f7603a/i);
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
  for (const label of ['Work', 'Services', 'Process', 'Pricing', 'Contact']) {
    assert.match(navigation, new RegExp(`'${label}'`));
  }
  assert.match(shell, /Start a revamp/);
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

