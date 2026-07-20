import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('showcase scrolling keeps the approved physical scroll distance', async () => {
  const source = await read('src/services/showcase-comparison.js');
  assert.match(source, /DESKTOP_SCROLL_DISTANCE_VH\s*=\s*520/);
  assert.match(source, /MOBILE_SCROLL_DISTANCE_VH\s*=\s*560/);
  assert.match(source, /chapter\.style\.height/);
  assert.match(source, /1svh/);
});

test('showcase progress is gently eased and media advances through presented frames', async () => {
  const source = await read('src/services/showcase-comparison.js');
  assert.match(source, /SCROLL_SMOOTHING_MS\s*=\s*360/);
  assert.match(source, /MAX_PROGRESS_PER_SECOND\s*=\s*0\.24/);
  assert.match(source, /PRESENTATION_FPS\s*=\s*24/);
  assert.match(source, /MAX_SEEK_STEP_SECONDS\s*=\s*1\s*\/\s*12/);
  assert.match(source, /FORWARD_PLAY_THRESHOLD_SECONDS\s*=\s*0\.18/);
  assert.match(source, /Math\.exp/);
  assert.match(source, /targetProgress/);
  assert.match(source, /renderedProgress/);
  assert.match(source, /requestVideoFrameCallback/);
  assert.match(source, /FRAME_SETTLE_TIMEOUT_MS\s*=\s*120/);
  assert.match(source, /showcaseActive/);
  assert.match(source, /removeAttribute\('src'\)/);
  assert.doesNotMatch(source, /createObjectURL|response\.blob/);
});
