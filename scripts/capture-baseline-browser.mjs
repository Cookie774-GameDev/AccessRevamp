import { spawn } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { startVerifiedBaselineServer } from './lib/baseline-server.mjs';
import { redactEvidence } from './lib/evidence-redaction.mjs';
import { classifyLighthouseResult } from './lib/lighthouse-result.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDirectory = resolve(root, 'docs/evidence/baseline/2026-07-18');
const routes = Object.freeze(['/', '/pricing', '/work', '/cinematic-scroll']);
const widths = Object.freeze([375, 768, 1024, 1440]);

const safeName = (route) => route === '/' ? 'home' : route.slice(1).replaceAll(/[^a-z0-9]+/gi, '-');

async function runLighthouse(route, baseUrl) {
  const cliPath = resolve(process.env.APPDATA || '', 'npm/node_modules/lighthouse/cli/index.js');
  const name = safeName(route);
  const outputPath = resolve(evidenceDirectory, `lighthouse-${name}.json`);
  try {
    await access(cliPath);
  } catch {
    const unavailable = { route, status: 'unavailable', reason: 'Global Lighthouse CLI was not found.' };
    await writeFile(outputPath, `${JSON.stringify(unavailable, null, 2)}\n`, 'utf8');
    return unavailable;
  }

  return await new Promise((resolveRun) => {
    const child = spawn(process.execPath, [
      cliPath,
      `${baseUrl}${route}`,
      '--output=json',
      `--output-path=${outputPath}`,
      '--quiet',
      '--chrome-flags=--headless --disable-gpu',
    ], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', async (code) => {
      let report = '';
      try {
        report = await readFile(outputPath, 'utf8');
      } catch {
        // The classifier records a factual failure when no report was written.
      }
      const classification = classifyLighthouseResult({ exitCode: code, report, stderr });
      const result = {
        route,
        ...classification,
        output: relative(root, outputPath).replaceAll('\\', '/'),
      };
      if (classification.status === 'failed') {
        await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
      } else {
        const sanitizedReport = redactEvidence(JSON.parse(report));
        await writeFile(outputPath, `${JSON.stringify(sanitizedReport, null, 2)}\n`, 'utf8');
      }
      resolveRun(result);
    });
  });
}

await mkdir(evidenceDirectory, { recursive: true });
const results = [];
let browser;
let server;
try {
  const preview = await startVerifiedBaselineServer(root);
  server = preview.server;
  const { baseUrl } = preview;
  browser = await chromium.launch({ headless: true });
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    for (const route of routes) {
      const consoleErrors = [];
      const failedRequests = [];
      const onConsole = (message) => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500)); };
      const onRequestFailed = (request) => failedRequests.push({ url: new URL(request.url()).pathname, error: request.failure()?.errorText || 'unknown' });
      page.on('console', onConsole);
      page.on('requestfailed', onRequestFailed);
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
      await page.screenshot({
        path: resolve(evidenceDirectory, `${safeName(route)}-${width}.png`),
        fullPage: true,
      });
      const axe = await new AxeBuilder({ page }).analyze();
      await writeFile(
        resolve(evidenceDirectory, `axe-${safeName(route)}-${width}.json`),
        `${JSON.stringify(redactEvidence(axe), null, 2)}\n`,
        'utf8',
      );
      results.push({ route, width, status: response?.status() || null, consoleErrors, failedRequests });
      page.off('console', onConsole);
      page.off('requestfailed', onRequestFailed);
    }
    await context.close();
  }
  const lighthouse = [];
  for (const route of routes) lighthouse.push(await runLighthouse(route, baseUrl));
  await writeFile(
    resolve(evidenceDirectory, 'browser-results.json'),
    `${JSON.stringify(redactEvidence({ capturedAt: new Date().toISOString(), results, lighthouse }), null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(`${JSON.stringify({ screenshots: routes.length * widths.length, axeReports: routes.length * widths.length, lighthouse }, null, 2)}\n`);
} finally {
  await browser?.close();
  await server?.close();
}
