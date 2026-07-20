import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('showcase scrolling uses a longer physical scroll distance', async () => {
  const source = await read('src/services/showcase-comparison.js');
  assert.match(source, /DESKTOP_SCROLL_DISTANCE_VH\s*=\s*520/);
  assert.match(source, /MOBILE_SCROLL_DISTANCE_VH\s*=\s*560/);
  assert.match(source, /chapter\.style\.height/);
  assert.match(source, /1svh/);
});

test('showcase scroll progress is eased and media seeks are coalesced', async () => {
  const source = await read('src/services/showcase-comparison.js');
  assert.match(source, /SCROLL_SMOOTHING_MS\s*=\s*180/);
  assert.match(source, /MAX_PROGRESS_PER_SECOND\s*=\s*0\.9/);
  assert.match(source, /Math\.exp/);
  assert.match(source, /targetProgress/);
  assert.match(source, /renderedProgress/);
  assert.match(source, /seeked/);
  assert.match(source, /SEEK_SETTLE_TIMEOUT_MS/);
  assert.doesNotMatch(source, /createObjectURL|response\.blob/);
});
