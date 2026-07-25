import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { workPage } from '../src/pages/work.js';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const oldConcepts = [
  'Northline Goods',
  'Morrow Studio',
  'Fable & Finch',
  'Sip / Savor',
  'Move Well',
  'Form / Function',
  'Aether One',
];

test('portfolio renders five working scroll experiences and no retired concept archive', () => {
  const html = workPage();

  for (const title of [
    'Japan Through Time',
    'The Moonfold Ronin',
    'Verdant Edge Lawn Care',
    'Northframe Studio',
    'Olympus Academy',
  ]) {
    assert.match(html, new RegExp(title));
  }

  assert.match(html, /href="\/portfolio\/japan-through-time\/index\.html"/);
  assert.match(html, /href="\/portfolio\/moonfold-ronin\/index\.html"/);
  assert.equal((html.match(/data-showcase-chapter/g) || []).length, 3);
  assert.doesNotMatch(html, /data-filter=/);
  for (const title of oldConcepts) assert.doesNotMatch(html, new RegExp(title.replace('/', '\\/')));
});

test('standalone scroll films expose branded return navigation and complete local media', async () => {
  const experiences = [
    { slug: 'japan-through-time', scenes: 5 },
    { slug: 'moonfold-ronin', scenes: 20 },
  ];

  for (const experience of experiences) {
    const directory = join(root, 'public', 'portfolio', experience.slug);
    const [html, script, styles] = await Promise.all([
      readFile(join(directory, 'index.html'), 'utf8'),
      readFile(join(directory, 'app.js'), 'utf8'),
      readFile(join(directory, 'styles.css'), 'utf8'),
    ]);

    assert.match(html, /href="\/portfolio"/);
    assert.match(html, /Back to AccessRevamp portfolio/);
    assert.match(html, /<main[^>]+(?:id|class)="[^"]*story/);
    assert.match(script, /requestAnimationFrame/);
    assert.match(script, /currentTime\s*=/);
    assert.match(styles, /prefers-reduced-motion:\s*reduce/);

    for (let index = 1; index <= experience.scenes; index += 1) {
      const id = String(index).padStart(2, '0');
      for (const extension of ['jpg', 'mp4']) {
        const path = join(directory, 'assets', `scene-${id}.${extension}`);
        await access(path);
        const info = await stat(path);
        assert.ok(info.size > 0, `${experience.slug} scene ${id}.${extension} is empty`);
        assert.ok(info.size < 25 * 1024 * 1024, `${experience.slug} scene ${id}.${extension} exceeds Cloudflare's per-asset limit`);
      }
    }
  }
});
