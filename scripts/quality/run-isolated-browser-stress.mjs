import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const port = 43818;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = resolve('artifacts/isolated-stress');
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

async function runViewport(browser, name, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
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

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const localRequestFailures = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300));
  });
  page.on('pageerror', (error) => pageErrors.push(String(error?.message || error).slice(0, 300)));
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) {
      localRequestFailures.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' });
    }
  });

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
  assert.equal(layout.chapterCount, 3);
  assert.equal(layout.videoCount, 6);

  const setChapterProgress = async (progress, steps) => page.evaluate(async ({ progress: next, steps: count }) => {
    const chapter = document.querySelector('[data-showcase-chapter]');
    const travel = Math.max(1, chapter.offsetHeight - innerHeight);
    const documentTop = chapter.getBoundingClientRect().top + scrollY;
    const target = documentTop + travel * next;
    const start = scrollY;
    const frameGaps = [];
    let previous = performance.now();
    for (let index = 1; index <= count; index += 1) {
      const eased = index / count;
      scrollTo(0, start + (target - start) * eased);
      await new Promise((resolvePromise) => requestAnimationFrame((time) => {
        frameGaps.push(time - previous);
        previous = time;
        resolvePromise();
      }));
    }
    return frameGaps;
  }, { progress, steps });

  await setChapterProgress(0.04, 20);
  await page.waitForFunction(() => {
    const chapter = document.querySelector('[data-showcase-chapter]');
    const videos = chapter ? [...chapter.querySelectorAll('video')] : [];
    return videos.length === 2 && videos.every((video) => video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0);
  }, null, { timeout: 25_000 });
  await page.waitForTimeout(500);

  const startTimes = await page.locator('[data-showcase-chapter]').first().locator('video').evaluateAll((videos) => videos.map((video) => video.currentTime));
  const forwardFrames = await setChapterProgress(0.82, 180);
  await page.waitForTimeout(3_800);
  const forward = await page.locator('[data-showcase-chapter]').first().evaluate((chapter) => ({
    progress: Number(chapter.dataset.progress || 0),
    times: [...chapter.querySelectorAll('video')].map((video) => video.currentTime),
    errors: [...chapter.querySelectorAll('video')].map((video) => video.error?.code || 0),
  }));

  assert.ok(forward.progress > 0.68, `${name} forward progress stalled at ${forward.progress}`);
  assert.ok(forward.times.every((time, index) => time > startTimes[index] + 0.35), `${name} videos did not advance: ${forward.times}`);
  assert.ok(forward.errors.every((code) => code === 0), `${name} media error codes: ${forward.errors}`);
  assert.ok(Math.abs(forward.times[0] - forward.times[1]) < 0.55, `${name} paired videos drifted: ${forward.times}`);

  const reverseFrames = await setChapterProgress(0.20, 150);
  await page.waitForTimeout(3_400);
  const reverse = await page.locator('[data-showcase-chapter]').first().evaluate((chapter) => ({
    progress: Number(chapter.dataset.progress || 0),
    times: [...chapter.querySelectorAll('video')].map((video) => video.currentTime),
  }));
  assert.ok(reverse.progress < forward.progress - 0.25, `${name} reverse progress did not move: ${reverse.progress}`);
  assert.ok(reverse.times.every((time, index) => time < forward.times[index] - 0.25), `${name} videos did not reverse: ${reverse.times}`);

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
  const frames = [...forwardFrames, ...reverseFrames];
  const result = {
    name,
    viewport,
    layout,
    forward,
    reverse,
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
    consoleErrors,
    pageErrors,
    localRequestFailures,
  };

  assert.equal(pageErrors.length, 0, JSON.stringify(pageErrors));
  assert.equal(localRequestFailures.length, 0, JSON.stringify(localRequestFailures.slice(0, 5)));
  assert.equal(consoleErrors.length, 0, JSON.stringify(consoleErrors.slice(0, 5)));
  assert.ok(result.frameGapMs.p95 < 250, `${name} p95 frame gap ${result.frameGapMs.p95}ms`);
  assert.ok(result.frameGapMs.max < 2_000, `${name} max frame gap ${result.frameGapMs.max}ms`);
  assert.ok(result.longTasks.maxMs < 2_000, `${name} max long task ${result.longTasks.maxMs}ms`);

  await context.close();
  return result;
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
  const report = { isolated: true, target: baseUrl, generatedAt: new Date().toISOString(), results };
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
