import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('showcase scrolling uses a responsive physical scroll distance', async () => {
  const source = await read('src/services/showcase-comparison.js');
  assert.match(source, /DESKTOP_SCROLL_DISTANCE_VH\s*=\s*360/);
  assert.match(source, /MOBILE_SCROLL_DISTANCE_VH\s*=\s*400/);
  assert.match(source, /chapter\.style\.height/);
  assert.match(source, /1svh/);
});

test('showcase progress eases toward fast scroll targets and coalesces in-flight video seeks', async () => {
  const source = await read('src/services/showcase-comparison.js');
  assert.match(source, /PRESENTATION_FPS\s*=\s*18/);
  assert.match(source, /SCROLL_SMOOTHING_MS\s*=\s*52/);
  assert.match(source, /PROGRESS_SNAP_EPSILON\s*=\s*0\.001/);
  assert.match(source, /MEDIA_SYNC_EPSILON_SECONDS\s*=\s*1\s*\/\s*48/);
  assert.match(source, /FRAME_SETTLE_TIMEOUT_MS\s*=\s*80/);
  assert.match(source, /FAST_SEEK_MINIMUM_JUMP_SECONDS/);
  assert.match(source, /typeof video\.fastSeek === 'function'/);
  assert.match(source, /video\.fastSeek\(targetTime\)/);
  assert.match(source, /state\.settleExactly/);
  assert.match(source, /targetProgress/);
  assert.match(source, /renderedProgress/);
  assert.match(source, /1\s*-\s*Math\.exp\(-elapsed\s*\/\s*smoothingWindow\)/);
  assert.match(source, /requestAnimationFrame\(animatePresentation\)/);
  assert.match(source, /requestVideoFrameCallback/);
  assert.match(source, /video\.currentTime\s*=\s*targetTime/);
  assert.match(source, /state\.pendingSeek/);
  assert.match(source, /presentActiveChapter\(time, activeChanged\)/);
  assert.match(source, /commitPreviousBoundary/);
  assert.match(source, /showcaseActive/);
  assert.match(source, /removeAttribute\('src'\)/);
  const presentation = source.slice(
    source.indexOf('const presentActiveChapter'),
    source.indexOf('const setImmediateProgress'),
  );
  assert.match(presentation, /if \(settled\) state\.renderedProgress = state\.targetProgress/);
  assert.doesNotMatch(presentation, /\n\s*state\.renderedProgress = state\.targetProgress;\n\s*const/);
  const pendingSeek = source.slice(
    source.indexOf('if (state.pendingSeek)'),
    source.indexOf('state.pendingSeek = true'),
  );
  assert.doesNotMatch(pendingSeek, /video\.currentTime\s*=/);
  assert.doesNotMatch(source, /video\.play\(\)/);
  assert.doesNotMatch(source, /createObjectURL|response\.blob/);
});

test('showcase videos wait for proximity instead of eagerly loading during page startup', async () => {
  const source = await read('src/services/showcase-comparison.js');
  assert.doesNotMatch(source, /const idlePreload\s*=\s*\(\)\s*=>\s*prepareChapter\(chapters\[0\], 'auto'\)/);
  assert.doesNotMatch(source, /requestIdleCallback\(idlePreload|setTimeout\(idlePreload/);
  assert.match(source, /preloadObserver\?\.observe\(chapter\)/);
});
