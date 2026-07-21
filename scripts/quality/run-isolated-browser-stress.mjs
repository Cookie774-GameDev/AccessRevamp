import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const port = 43818;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = resolve('artifacts/isolated-stress');
const EXPECTED_CHAPTERS = 3;
const EXPECTED_VIDEOS = 6;
await readFile(resolve('dist/index.html'), 'utf8');
await mkdir(outputDir, { recursive: true });

const server = spawn(process.execPath, ['scripts/preview-static.mjs', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'production' },
});

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 15_000) {
    const response = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(1_000) }).catch(() => null);
    if (response?.ok) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error('Preview server did not start.');
}

function percentile(values, percent) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percent / 100) - 1)];
}

async function installLocalNetworkBoundary(context) {
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) await route.continue();
    else await route.abort('blockedbyclient');
  });
  await context.addInitScript(() => {
    try { Object.defineProperty(navigator, 'webdriver', { configurable: true, get: () => false }); }
    catch { /* Browser automation visibility is only needed to exercise media loading. */ }
    globalThis.__isolatedLongTasks = [];
    if ('PerformanceObserver' in globalThis) {
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) globalThis.__isolatedLongTasks.push(entry.duration);
        }).observe({ type: 'longtask', buffered: true });
      } catch { /* Long-task timing is optional. */ }
    }
  });
}

function observePage(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const localRequestFailures = [];
  const expectedMediaAborts = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300));
  });
  page.on('pageerror', (error) => pageErrors.push(String(error?.message || error).slice(0, 300)));
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return;
    const error = request.failure()?.errorText || 'unknown';
    if (error === 'net::ERR_ABORTED' && url.pathname.startsWith('/media/showcases/')) {
      expectedMediaAborts.push({ url: request.url(), error });
    } else {
      localRequestFailures.push({ url: request.url(), error });
    }
  });
  return { consoleErrors, pageErrors, localRequestFailures, expectedMediaAborts };
}

async function setChapterProgress(page, chapterIndex, progress, steps) {
  return page.evaluate(async ({ chapterIndex: index, progress: next, steps: count }) => {
    const chapter = document.querySelectorAll('[data-showcase-chapter]')[index];
    if (!chapter) throw new Error(`Missing showcase chapter ${index}`);
    const travel = Math.max(1, chapter.offsetHeight - innerHeight);
    const documentTop = chapter.getBoundingClientRect().top + scrollY;
    const target = documentTop + travel * next;
    const start = scrollY;
    const frameGaps = [];
    let previous = performance.now();
    for (let step = 1; step <= count; step += 1) {
      scrollTo(0, start + (target - start) * (step / count));
      await new Promise((resolvePromise) => requestAnimationFrame((time) => {
        frameGaps.push(time - previous);
        previous = time;
        resolvePromise();
      }));
    }
    return frameGaps;
  }, { chapterIndex, progress, steps });
}

async function waitForChapterMedia(page, chapterIndex) {
  await page.waitForFunction((index) => {
    const chapter = document.querySelectorAll('[data-showcase-chapter]')[index];
    const videos = chapter ? [...chapter.querySelectorAll('video')] : [];
    return videos.length === 2 && videos.every((video) => (
      video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0
    ));
  }, chapterIndex, { timeout: 25_000 });
}

async function readChapter(page, chapterIndex) {
  return page.locator('[data-showcase-chapter]').nth(chapterIndex).evaluate((chapter) => {
    const videos = [...chapter.querySelectorAll('video')];
    return {
      name: chapter.querySelector('h3')?.textContent?.trim() || `Chapter ${chapterIndex + 1}`,
      progress: Number(chapter.dataset.progress || 0),
      times: videos.map((video) => video.currentTime),
      durations: videos.map((video) => video.duration),
      normalized: videos.map((video) => video.duration > 0 ? video.currentTime / video.duration : 0),
      errors: videos.map((video) => video.error?.code || 0),
      paused: videos.map((video) => video.paused),
    };
  });
}

async function stressChapter(page, viewportName, chapterIndex) {
  const frameGaps = [];
  frameGaps.push(...await setChapterProgress(page, chapterIndex, 0.04, 20));
  await waitForChapterMedia(page, chapterIndex);
  await page.waitForTimeout(450);
  const start = await readChapter(page, chapterIndex);

  frameGaps.push(...await setChapterProgress(page, chapterIndex, 0.82, 120));
  await page.waitForTimeout(2_800);
  const forward = await readChapter(page, chapterIndex);
  assert.ok(forward.progress > 0.68, `${viewportName} ${forward.name} forward progress stalled at ${forward.progress}`);
  assert.ok(forward.normalized.every((value, index) => value > start.normalized[index] + 0.28), `${viewportName} ${forward.name} videos did not advance: ${forward.normalized}`);
  assert.ok(forward.errors.every((code) => code === 0), `${viewportName} ${forward.name} media error codes: ${forward.errors}`);
  assert.ok(Math.abs(forward.normalized[0] - forward.normalized[1]) < 0.07, `${viewportName} ${forward.name} paired videos drifted: ${forward.normalized}`);

  frameGaps.push(...await setChapterProgress(page, chapterIndex, 0.20, 105));
  await page.waitForTimeout(2_700);
  const reverse = await readChapter(page, chapterIndex);
  assert.ok(reverse.progress < forward.progress - 0.25, `${viewportName} ${reverse.name} reverse progress did not move: ${reverse.progress}`);
  assert.ok(reverse.normalized.every((value, index) => value < forward.normalized[index] - 0.22), `${viewportName} ${reverse.name} videos did not reverse: ${reverse.normalized}`);
  assert.ok(Math.abs(reverse.normalized[0] - reverse.normalized[1]) < 0.07, `${viewportName} ${reverse.name} reverse pair drifted: ${reverse.normalized}`);

  return { chapterIndex, name: forward.name, start, forward, reverse, frameGaps };
}

async function testTouchContainment(page) {
  await setChapterProgress(page, 0, 0.35, 45);
  await page.waitForTimeout(1_600);
  const result = await page.evaluate(async () => {
    const chapter = document.querySelectorAll('[data-showcase-chapter]')[0];
    const stage = chapter.querySelector('[data-showcase-stage]');
    const before = { scrollY, progress: Number(chapter.dataset.progress || 0) };
    const options = { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 7401, isPrimary: true };
    stage.dispatchEvent(new PointerEvent('pointerdown', { ...options, clientX: 180, clientY: 260 }));
    stage.dispatchEvent(new PointerEvent('pointermove', { ...options, clientX: 190, clientY: 540 }));
    await new Promise((resolvePromise) => requestAnimationFrame(resolvePromise));
    const during = {
      scrollY,
      progress: Number(chapter.dataset.progress || 0),
      dragging: chapter.dataset.dragging,
      touchAction: stage.style.touchAction,
    };
    stage.dispatchEvent(new PointerEvent('pointerup', { ...options, clientX: 190, clientY: 540 }));
    await new Promise((resolvePromise) => requestAnimationFrame(resolvePromise));
    const released = {
      dragging: chapter.dataset.dragging || '',
      touchAction: stage.style.touchAction,
    };
    const scrollBeforeResume = scrollY;
    scrollBy(0, 120);
    await new Promise((resolvePromise) => requestAnimationFrame(resolvePromise));
    return {
      before,
      during,
      released,
      resumedScrollDelta: scrollY - scrollBeforeResume,
    };
  });

  assert.equal(result.during.scrollY, result.before.scrollY, 'Touch scrub moved the document while captured.');
  assert.equal(result.during.dragging, 'true');
  assert.equal(result.during.touchAction, 'none');
  assert.ok(Math.abs(result.during.progress - result.before.progress) > 0.08, 'Touch scrub did not change progress.');
  assert.equal(result.released.dragging, '');
  assert.equal(result.released.touchAction, '');
  assert.ok(result.resumedScrollDelta > 50, 'Normal page scrolling did not resume after pointer release.');
  return result;
}

async function testRangeControl(page) {
  const result = await page.evaluate(async () => {
    const chapter = document.querySelectorAll('[data-showcase-chapter]')[1];
    const range = chapter.querySelector('[data-showcase-range]');
    const output = chapter.querySelector('[data-showcase-output]');
    range.value = '63';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolvePromise) => requestAnimationFrame(resolvePromise));
    return {
      progress: Number(chapter.dataset.progress || 0),
      value: range.value,
      output: output.textContent,
    };
  });
  assert.ok(Math.abs(result.progress - 0.63) < 0.011, `Range progress was ${result.progress}`);
  assert.equal(result.value, '63');
  assert.equal(result.output, '63%');
  return result;
}

async function runViewport(browser, name, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
  await installLocalNetworkBoundary(context);
  const page = await context.newPage();
  const observations = observePage(page);

  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('[data-showcase-chapter]', { timeout: 15_000 });
  await page.waitForTimeout(600);

  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    chapterCount: document.querySelectorAll('[data-showcase-chapter]').length,
    videoCount: document.querySelectorAll('[data-showcase-chapter] video').length,
  }));
  assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `${name} horizontal overflow: ${layout.scrollWidth} > ${layout.clientWidth}`);
  assert.equal(layout.chapterCount, EXPECTED_CHAPTERS);
  assert.equal(layout.videoCount, EXPECTED_VIDEOS);

  const chapters = [];
  for (let index = 0; index < EXPECTED_CHAPTERS; index += 1) {
    chapters.push(await stressChapter(page, name, index));
  }

  const touch = name === 'mobile' ? await testTouchContainment(page) : null;
  const range = await testRangeControl(page);

  for (const route of ['/pricing', '/portfolio', '/', '/contact', '/']) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(150);
    assert.match(await page.title(), /AccessRevamp/);
  }

  const timing = await page.evaluate(() => ({
    longTasks: globalThis.__isolatedLongTasks || [],
    memory: performance.memory ? {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
    } : null,
  }));
  const frames = chapters.flatMap((chapter) => chapter.frameGaps);
  const result = {
    name,
    viewport,
    layout,
    chapters: chapters.map(({ frameGaps: _frameGaps, ...chapter }) => chapter),
    touch,
    range,
    frameGapMs: {
      p50: Number(percentile(frames, 50).toFixed(2)),
      p95: Number(percentile(frames, 95).toFixed(2)),
      p99: Number(percentile(frames, 99).toFixed(2)),
      max: Number(Math.max(...frames).toFixed(2)),
    },
    longTasks: {
      count: timing.longTasks.length,
      maxMs: Number(Math.max(0, ...timing.longTasks).toFixed(2)),
    },
    memory: timing.memory,
    ...observations,
  };

  assert.equal(observations.pageErrors.length, 0, JSON.stringify(observations.pageErrors));
  assert.equal(observations.localRequestFailures.length, 0, JSON.stringify(observations.localRequestFailures.slice(0, 5)));
  assert.equal(observations.consoleErrors.length, 0, JSON.stringify(observations.consoleErrors.slice(0, 5)));
  assert.ok(result.frameGapMs.p95 < 250, `${name} p95 frame gap ${result.frameGapMs.p95}ms`);
  assert.ok(result.frameGapMs.max < 2_000, `${name} max frame gap ${result.frameGapMs.max}ms`);
  assert.ok(result.longTasks.maxMs < 2_000, `${name} max long task ${result.longTasks.maxMs}ms`);

  await context.close();
  return result;
}

async function runReducedMotion(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await installLocalNetworkBoundary(context);
  const page = await context.newPage();
  const observations = observePage(page);
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('[data-showcase-range]', { timeout: 15_000 });

  const manual = await page.evaluate(async () => {
    const chapter = document.querySelector('[data-showcase-chapter]');
    const range = chapter.querySelector('[data-showcase-range]');
    const output = chapter.querySelector('[data-showcase-output]');
    range.value = '72';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    return {
      progress: Number(chapter.dataset.progress || 0),
      output: output.textContent,
      paused: [...chapter.querySelectorAll('video')].map((video) => video.paused),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  assert.ok(Math.abs(manual.progress - 0.72) < 0.011, `Reduced-motion manual progress was ${manual.progress}`);
  assert.equal(manual.output, '72%');
  assert.ok(manual.paused.every(Boolean), `Reduced-motion videos were playing: ${manual.paused}`);
  assert.ok(manual.overflow <= 1, `Reduced-motion mobile overflow was ${manual.overflow}px`);
  assert.equal(observations.pageErrors.length, 0, JSON.stringify(observations.pageErrors));
  assert.equal(observations.localRequestFailures.length, 0, JSON.stringify(observations.localRequestFailures));
  assert.equal(observations.consoleErrors.length, 0, JSON.stringify(observations.consoleErrors));
  await context.close();
  return { manual, ...observations };
}

let browser;
const results = [];
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-dev-shm-usage', '--disable-background-timer-throttling'],
  });
  results.push(await runViewport(browser, 'desktop', { width: 1440, height: 900 }));
  results.push(await runViewport(browser, 'mobile', { width: 390, height: 844 }));
  const reducedMotion = await runReducedMotion(browser);
  const report = { isolated: true, target: baseUrl, generatedAt: new Date().toISOString(), results, reducedMotion };
  await writeFile(resolve(outputDir, 'browser-stress.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
} catch (error) {
  const report = {
    isolated: true,
    target: baseUrl,
    generatedAt: new Date().toISOString(),
    results,
    error: {
      name: String(error?.name || 'Error'),
      message: String(error?.message || error).slice(0, 1000),
      stack: String(error?.stack || '').slice(0, 8000),
    },
  };
  await writeFile(resolve(outputDir, 'browser-stress-error.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.error(error);
  throw error;
} finally {
  await browser?.close().catch(() => undefined);
  server.kill('SIGTERM');
  await new Promise((resolvePromise) => {
    const timer = setTimeout(resolvePromise, 2_000);
    server.once('exit', () => { clearTimeout(timer); resolvePromise(); });
  });
}
