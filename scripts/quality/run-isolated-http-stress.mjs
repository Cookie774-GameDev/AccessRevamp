import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const port = 43817;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = resolve('artifacts/isolated-stress');
const routes = [
  '/', '/pricing', '/portfolio', '/free-snapshot', '/process',
  '/contact', '/privacy', '/terms', '/success', '/cancel',
];
const concurrency = 48;
const iterationsPerWorker = 30;
const requestTimeoutMs = 10_000;

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

const durations = [];
const failures = [];
let completed = 0;

async function timedFetch(url, options = {}) {
  const started = performance.now();
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      ...options,
      signal: options.signal || AbortSignal.timeout(requestTimeoutMs),
    });
    const elapsed = performance.now() - started;
    durations.push(elapsed);
    completed += 1;
    return response;
  } catch (error) {
    failures.push({ url, name: String(error?.name || 'Error'), message: String(error?.message || '').slice(0, 160) });
    throw error;
  }
}

function percentile(values, percent) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((percent / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

try {
  await waitForServer();

  await Promise.all(Array.from({ length: concurrency }, (_, worker) => (async () => {
    for (let iteration = 0; iteration < iterationsPerWorker; iteration += 1) {
      const route = routes[(worker + iteration) % routes.length];
      const response = await timedFetch(`${baseUrl}${route}`);
      if (response.status !== 200) failures.push({ url: route, status: response.status });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('text/html')) failures.push({ url: route, contentType });
      await response.arrayBuffer();
    }
  })()));

  const headResponses = await Promise.all(Array.from({ length: 100 }, (_, index) => timedFetch(
    `${baseUrl}${routes[index % routes.length]}`,
    { method: 'HEAD' },
  )));
  assert.ok(headResponses.every((response) => response.status === 200));

  const postResponses = await Promise.all(Array.from({ length: 100 }, () => timedFetch(`${baseUrl}/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })));
  assert.ok(postResponses.every((response) => response.status === 405));

  const indexHtml = await readFile(resolve('dist/index.html'), 'utf8');
  const assetPath = indexHtml.match(/(?:src|href)="(\/assets\/[^\"]+)"/)?.[1] || '/';
  await Promise.all(Array.from({ length: 100 }, async () => {
    const controller = new AbortController();
    const pending = fetch(`${baseUrl}${assetPath}`, { signal: controller.signal }).catch((error) => error);
    queueMicrotask(() => controller.abort());
    await pending;
  }));

  const malformed = await fetch(`${baseUrl}/%E0%A4%A`);
  assert.equal(malformed.status, 400);

  const health = await fetch(`${baseUrl}/`);
  assert.equal(health.status, 200);
  assert.match(await health.text(), /AccessRevamp/i);

  const report = {
    isolated: true,
    target: baseUrl,
    generatedAt: new Date().toISOString(),
    concurrentWorkers: concurrency,
    iterationsPerWorker,
    completedRequests: completed,
    failedRequests: failures.length,
    latencyMs: {
      p50: Number(percentile(durations, 50).toFixed(2)),
      p95: Number(percentile(durations, 95).toFixed(2)),
      p99: Number(percentile(durations, 99).toFixed(2)),
      max: Number(Math.max(...durations).toFixed(2)),
    },
    failures: failures.slice(0, 20),
  };
  await writeFile(resolve(outputDir, 'http-stress.json'), `${JSON.stringify(report, null, 2)}\n`);

  assert.equal(failures.length, 0, JSON.stringify(failures.slice(0, 5)));
  assert.ok(report.latencyMs.p95 < 1_200, `Local p95 was ${report.latencyMs.p95}ms`);
  console.log(JSON.stringify(report));
} finally {
  server.kill('SIGTERM');
  await new Promise((resolvePromise) => {
    const timer = setTimeout(resolvePromise, 2_000);
    server.once('exit', () => { clearTimeout(timer); resolvePromise(); });
  });
}
