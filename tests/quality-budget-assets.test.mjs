import assert from 'node:assert/strict';
import test from 'node:test';
import { initialManifestFiles } from '../scripts/quality/budget-assets.mjs';

test('initial asset measurement follows static imports and excludes lazy route entries', () => {
  const manifest = {
    entry: {
      file: 'assets/entry.js',
      isEntry: true,
      imports: ['framework'],
      dynamicImports: ['lazy'],
      css: ['assets/entry.css'],
    },
    framework: {
      file: 'assets/framework.js',
      imports: ['runtime'],
    },
    runtime: {
      file: 'assets/runtime.js',
    },
    lazy: {
      file: 'assets/lazy.js',
      isDynamicEntry: true,
      css: ['assets/lazy.css'],
    },
  };

  assert.deepEqual(
    [...initialManifestFiles(manifest)].sort(),
    ['assets/entry.css', 'assets/entry.js', 'assets/framework.js', 'assets/runtime.js'],
  );
});
