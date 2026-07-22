import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const port = 43819;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = resolve('artifacts/isolated-stress');
const routes = ['/signup', '/login', '/account/projects'];
const viewports = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
];

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
  throw new Error('Auth stress preview server did not start.');
}

function percentile(values, percent) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percent / 100) - 1)];
}

async function inspectAuthPage(page, expectedMode) {
  await page.waitForSelector('[data-auth-page]', { timeout: 10_000 });
  return page.evaluate((mode) => {
    const root = document.querySelector('[data-auth-page]');
    const panel = document.querySelector('.auth-panel');
    const experience = document.querySelector('.auth-experience');
    const inputs = [...document.querySelectorAll('[data-auth-form] input')];
    return {
      mode: root?.dataset.authMode,
      panel: Boolean(panel),
      submit: Boolean(document.querySelector('[data-auth-form] button[type="submit"]')),
      phoneInputs: inputs.filter((input) => input.type === 'tel' || input.name === 'phone').length,
      passwordInputs: inputs.filter((input) => input.type === 'password').length,
      backgroundImage: getComputedStyle(experience).backgroundImage,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      title: document.title,
      expectedMode: mode,
    };
  }, expectedMode);
}

async function runViewport(browser, name, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) await route.continue();
    else await route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.message || error).slice(0, 300)));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300));
  });

  const durations = [];
  const samples = [];
  for (let cycle = 0; cycle < 12; cycle += 1) {
    for (const route of routes) {
      const started = performance.now();
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      durations.push(performance.now() - started);
      assert.match(await page.title(), /AccessRevamp/);

      if (route === '/signup' || route === '/login') {
        const mode = route.slice(1);
        const sample = await inspectAuthPage(page, mode);
        assert.equal(sample.mode, mode);
        assert.equal(sample.panel, true);
        assert.equal(sample.submit, true);
        assert.equal(sample.phoneInputs, 0);
        assert.equal(sample.passwordInputs, mode === 'signup' ? 2 : 1);
        assert.match(sample.backgroundImage, /gradient/i);
        assert.ok(sample.scrollWidth <= sample.clientWidth + 1, `${name} ${route} horizontal overflow`);
        samples.push({ cycle, route, ...sample });
      } else {
        await page.waitForSelector('[data-account-content]', { timeout: 10_000 });
        const layout = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `${name} ${route} horizontal overflow`);
      }
    }
  }

  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  await context.close();
  return {
    name,
    viewport,
    navigationCount: durations.length,
    navigationMs: {
      p50: Number(percentile(durations, 50).toFixed(2)),
      p95: Number(percentile(durations, 95).toFixed(2)),
      max: Number(Math.max(...durations).toFixed(2)),
    },
    samples: samples.length,
    pageErrors,
    consoleErrors,
  };
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const results = [];
  for (const [name, viewport] of viewports) results.push(await runViewport(browser, name, viewport));
  const report = {
    generatedAt: new Date().toISOString(),
    routes,
    cyclesPerViewport: 12,
    totalNavigations: results.reduce((total, result) => total + result.navigationCount, 0),
    results,
  };
  await writeFile(resolve(outputDir, 'auth-browser-stress.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close().catch(() => undefined);
  server.kill('SIGTERM');
  await new Promise((resolvePromise) => {
    const timer = setTimeout(() => {
      server.kill('SIGKILL');
      resolvePromise();
    }, 2_000);
    server.once('exit', () => {
      clearTimeout(timer);
      resolvePromise();
    });
  });
}
