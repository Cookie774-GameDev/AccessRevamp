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

test('showcase progress directly tracks scroll and retargets in-flight video seeks', async () => {
  const source = await read('src/services/showcase-comparison.js');
  assert.match(source, /PRESENTATION_FPS\s*=\s*24/);
  assert.match(source, /MEDIA_SYNC_EPSILON_SECONDS\s*=\s*1\s*\/\s*48/);
  assert.match(source, /FRAME_SETTLE_TIMEOUT_MS\s*=\s*160/);
  assert.match(source, /targetProgress/);
  assert.match(source, /renderedProgress/);
  assert.match(source, /state\.renderedProgress\s*=\s*state\.targetProgress/);
  assert.match(source, /requestVideoFrameCallback/);
  assert.match(source, /video\.currentTime\s*=\s*targetTime/);
  assert.match(source, /state\.pendingSeek/);
  assert.match(source, /presentActiveChapter\(time, activeChanged\)/);
  assert.match(source, /showcaseActive/);
  assert.match(source, /removeAttribute\('src'\)/);
  assert.doesNotMatch(source, /SCROLL_SMOOTHING_MS|MAX_PROGRESS_PER_SECOND|MAX_SEEK_STEP_SECONDS/);
  assert.doesNotMatch(source, /video\.play\(\)/);
  assert.doesNotMatch(source, /createObjectURL|response\.blob/);
});
