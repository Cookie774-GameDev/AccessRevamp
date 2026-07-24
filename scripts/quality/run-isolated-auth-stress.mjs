import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const port = 43819;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = resolve('artifacts/isolated-stress');
const routes = ['/signup', '/login', '/forgot-password', '/recover-account', '/account/projects'];
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

function colorChannels(value) {
  return (String(value).match(/\d+(?:\.\d+)?/g) || []).slice(0, 3).map(Number);
}

async function inspectAuthPage(page, expectedMode) {
  await page.waitForSelector('[data-auth-page]', { timeout: 10_000 });
  return page.evaluate((mode) => {
    const root = document.querySelector('[data-auth-page]');
    const panel = document.querySelector('.auth-panel');
    const experience = document.querySelector('.auth-experience');
    const header = document.querySelector('.site-header');
    const headerCta = document.querySelector('.nav-actions .button');
    const form = document.querySelector('[data-auth-form]');
    const submit = form?.querySelector('button[type="submit"]');
    const status = form?.querySelector('[data-auth-status]');
    const inputs = [...document.querySelectorAll('[data-auth-form] input')];
    const codeStep = document.querySelector('[data-auth-code-step]');
    const codeForm = document.querySelector('[data-auth-code-form]');
    const codeInput = codeForm?.querySelector('input[name="code"]');
    const codeSubmit = codeForm?.querySelector('button[type="submit"]');
    const fallback = document.querySelector('.auth-code-fallback');
    const topline = document.querySelector('.auth-panel__topline');
    const emailInput = form?.querySelector('input[type="email"]');
    const forgot = document.querySelector('.auth-recovery-link a');
    return {
      mode: root?.dataset.authMode,
      panel: Boolean(panel),
      submit: Boolean(submit),
      submitDisabled: submit?.disabled ?? true,
      status: status?.textContent?.trim() || '',
      phoneInputs: inputs.filter((input) => input.type === 'tel' || input.name === 'phone').length,
      passwordInputs: inputs.filter((input) => input.type === 'password').length,
      codeStep: Boolean(codeStep),
      codeStepHidden: codeStep?.hidden ?? false,
      codeForm: Boolean(codeForm),
      codeSubmit: Boolean(codeSubmit),
      codeInputMode: codeInput?.inputMode || '',
      codeAutocomplete: codeInput?.autocomplete || '',
      codePattern: codeInput?.pattern || '',
      codeMaxLength: codeInput?.maxLength || 0,
      fallbackNote: fallback?.textContent?.trim() || '',
      forgotPasswordLink: forgot?.getAttribute('href') || '',
      backgroundImage: getComputedStyle(experience).backgroundImage,
      headerBackground: getComputedStyle(header).backgroundColor,
      headerCtaBackground: getComputedStyle(headerCta).backgroundColor,
      toplineColor: getComputedStyle(topline).color,
      inputColor: getComputedStyle(emailInput).color,
      inputBackground: getComputedStyle(emailInput).backgroundColor,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      title: document.title,
      expectedMode: mode,
    };
  }, expectedMode);
}

async function inspectRecoveryPage(page) {
  await page.waitForSelector('[data-recovery-page]', { timeout: 10_000 });
  return page.evaluate(() => {
    const root = document.querySelector('[data-recovery-page]');
    const experience = document.querySelector('.auth-experience');
    const panel = document.querySelector('.auth-panel');
    const header = document.querySelector('.site-header');
    const headerCta = document.querySelector('.nav-actions .button');
    const requestForm = document.querySelector('[data-recovery-request-form]');
    const codeStep = document.querySelector('[data-recovery-code-step]');
    const codeForm = document.querySelector('[data-recovery-code-form]');
    const passwordStep = document.querySelector('[data-recovery-password-step]');
    const passwordForm = document.querySelector('[data-recovery-password-form]');
    const codeInput = codeForm?.querySelector('input[name="code"]');
    const emailInput = requestForm?.querySelector('input[type="email"]');
    const passwordInputs = [...(passwordForm?.querySelectorAll('input[type="password"]') || [])];
    const allInputs = [...document.querySelectorAll('[data-recovery-page] input')];
    const topline = document.querySelector('.auth-panel__topline');
    return {
      root: Boolean(root),
      panel: Boolean(panel),
      requestForm: Boolean(requestForm),
      requestVisible: requestForm ? !requestForm.hidden : false,
      requestSubmitDisabled: requestForm?.querySelector('button[type="submit"]')?.disabled ?? true,
      codeStep: Boolean(codeStep),
      codeStepHidden: codeStep?.hidden ?? false,
      codeForm: Boolean(codeForm),
      codeInputMode: codeInput?.inputMode || '',
      codeAutocomplete: codeInput?.autocomplete || '',
      codePattern: codeInput?.pattern || '',
      codeMaxLength: codeInput?.maxLength || 0,
      passwordStep: Boolean(passwordStep),
      passwordStepHidden: passwordStep?.hidden ?? false,
      passwordInputs: passwordInputs.length,
      phoneInputs: allInputs.filter((input) => input.type === 'tel' || input.name === 'phone').length,
      backgroundImage: getComputedStyle(experience).backgroundImage,
      headerBackground: getComputedStyle(header).backgroundColor,
      headerCtaBackground: getComputedStyle(headerCta).backgroundColor,
      toplineColor: getComputedStyle(topline).color,
      inputColor: getComputedStyle(emailInput).color,
      inputBackground: getComputedStyle(emailInput).backgroundColor,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      title: document.title,
    };
  });
}

async function exerciseCodePanel(page, mode) {
  await page.goto(`${baseUrl}/${mode}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.evaluate(({ storageKey, mode: nextMode }) => {
    sessionStorage.setItem(storageKey, JSON.stringify({
      mode: nextMode,
      kind: nextMode === 'signup' ? 'signup' : 'login',
      email: 'code-panel@example.test',
      emailHint: 'co••••••••@example.test',
      expiresAt: Date.now() + 300_000,
    }));
  }, { storageKey: 'accessrevamp.auth.pending-code.v2', mode });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('[data-auth-code-step]:not([hidden])', { timeout: 10_000 });
  const panel = await page.evaluate(() => {
    const input = document.querySelector('[data-auth-code-form] input[name="code"]');
    const step = document.querySelector('[data-auth-code-step]');
    const fallback = document.querySelector('.auth-code-fallback');
    const style = getComputedStyle(input);
    const stepRect = step.getBoundingClientRect();
    const fallbackRect = fallback.getBoundingClientRect();
    return {
      visible: !step.hidden,
      inputMode: input.inputMode,
      autocomplete: input.autocomplete,
      pattern: input.pattern,
      maxLength: input.maxLength,
      fontFamily: style.fontFamily,
      letterSpacing: style.letterSpacing,
      fallbackText: fallback.textContent?.trim() || '',
      fallbackFitsPanel: fallbackRect.width <= stepRect.width + 1,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  assert.equal(panel.visible, true);
  assert.equal(panel.inputMode, 'numeric');
  assert.equal(panel.autocomplete, 'one-time-code');
  assert.equal(panel.pattern, '[0-9]{6}');
  assert.equal(panel.maxLength, 6);
  assert.match(panel.fontFamily, /Courier/i);
  assert.notEqual(panel.letterSpacing, 'normal');
  assert.match(panel.fallbackText, /secure button/i);
  assert.match(panel.fallbackText, /AccessRevamp website/i);
  assert.equal(panel.fallbackFitsPanel, true, `${mode} fallback notice overflows the code panel`);
  assert.ok(panel.scrollWidth <= panel.clientWidth + 1, `${mode} code panel horizontal overflow`);
  return panel;
}

async function exerciseRecoveryCodePanel(page) {
  await page.goto(`${baseUrl}/forgot-password`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.evaluate((storageKey) => {
    sessionStorage.setItem(storageKey, JSON.stringify({
      email: 'recovery@example.test',
      emailHint: 're••••••@example.test',
      expiresAt: Date.now() + 300_000,
    }));
  }, 'accessrevamp.auth.recovery.v1');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('[data-recovery-code-step]:not([hidden])', { timeout: 10_000 });
  const panel = await page.evaluate(() => {
    const step = document.querySelector('[data-recovery-code-step]');
    const input = step.querySelector('input[name="code"]');
    const fallback = step.querySelector('.auth-code-fallback');
    return {
      visible: !step.hidden,
      inputMode: input.inputMode,
      autocomplete: input.autocomplete,
      pattern: input.pattern,
      maxLength: input.maxLength,
      fallbackText: fallback.textContent?.trim() || '',
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  assert.equal(panel.visible, true);
  assert.equal(panel.inputMode, 'numeric');
  assert.equal(panel.autocomplete, 'one-time-code');
  assert.equal(panel.pattern, '[0-9]{6}');
  assert.equal(panel.maxLength, 6);
  assert.match(panel.fallbackText, /recovery button/i);
  assert.match(panel.fallbackText, /AccessRevamp/i);
  assert.ok(panel.scrollWidth <= panel.clientWidth + 1, 'recovery code panel horizontal overflow');
  return panel;
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
        const headerChannels = colorChannels(sample.headerBackground);
        const ctaChannels = colorChannels(sample.headerCtaBackground);
        const toplineChannels = colorChannels(sample.toplineColor);
        const inputChannels = colorChannels(sample.inputColor);
        const inputBackground = colorChannels(sample.inputBackground);
        assert.equal(sample.mode, mode);
        assert.equal(sample.panel, true);
        assert.equal(sample.submit, true);
        assert.equal(sample.submitDisabled, false, `${name} ${route} shipped with account access disabled`);
        assert.doesNotMatch(sample.status, /account access is temporarily unavailable|account access is unavailable/i);
        assert.equal(sample.phoneInputs, 0);
        assert.equal(sample.passwordInputs, mode === 'signup' ? 2 : 1);
        assert.equal(sample.codeStep, true);
        assert.equal(sample.codeStepHidden, true);
        assert.equal(sample.codeForm, true);
        assert.equal(sample.codeSubmit, true);
        assert.equal(sample.codeInputMode, 'numeric');
        assert.equal(sample.codeAutocomplete, 'one-time-code');
        assert.equal(sample.codePattern, '[0-9]{6}');
        assert.equal(sample.codeMaxLength, 6);
        assert.match(sample.fallbackNote, /secure button/i);
        assert.equal(sample.forgotPasswordLink, mode === 'login' ? '/forgot-password' : '');
        assert.match(sample.backgroundImage, /gradient/i);
        assert.equal(headerChannels.length, 3, `${name} ${route} header background could not be measured`);
        assert.ok(Math.max(...headerChannels) < 45, `${name} ${route} header is too bright: ${sample.headerBackground}`);
        assert.equal(ctaChannels.length, 3, `${name} ${route} header CTA could not be measured`);
        assert.ok(Math.max(...ctaChannels) < 220, `${name} ${route} header CTA is too bright: ${sample.headerCtaBackground}`);
        assert.ok(Math.min(...toplineChannels) > 120, `${name} ${route} topline text is too dark: ${sample.toplineColor}`);
        assert.ok(Math.min(...inputChannels) > 180, `${name} ${route} input text is too dark: ${sample.inputColor}`);
        assert.ok(Math.max(...inputBackground) < 45, `${name} ${route} input background is too bright: ${sample.inputBackground}`);
        assert.ok(sample.scrollWidth <= sample.clientWidth + 1, `${name} ${route} horizontal overflow`);
        samples.push({ cycle, route, ...sample });
      } else if (route === '/forgot-password' || route === '/recover-account') {
        const sample = await inspectRecoveryPage(page);
        const headerChannels = colorChannels(sample.headerBackground);
        const ctaChannels = colorChannels(sample.headerCtaBackground);
        const toplineChannels = colorChannels(sample.toplineColor);
        const inputChannels = colorChannels(sample.inputColor);
        const inputBackground = colorChannels(sample.inputBackground);
        assert.equal(sample.root, true);
        assert.equal(sample.panel, true);
        assert.equal(sample.requestForm, true);
        assert.equal(sample.requestVisible, true);
        assert.equal(sample.requestSubmitDisabled, false);
        assert.equal(sample.codeStep, true);
        assert.equal(sample.codeStepHidden, true);
        assert.equal(sample.codeForm, true);
        assert.equal(sample.codeInputMode, 'numeric');
        assert.equal(sample.codeAutocomplete, 'one-time-code');
        assert.equal(sample.codePattern, '[0-9]{6}');
        assert.equal(sample.codeMaxLength, 6);
        assert.equal(sample.passwordStep, true);
        assert.equal(sample.passwordStepHidden, true);
        assert.equal(sample.passwordInputs, 2);
        assert.equal(sample.phoneInputs, 0);
        assert.match(sample.backgroundImage, /gradient/i);
        assert.ok(Math.max(...headerChannels) < 45, `${name} ${route} header is too bright`);
        assert.ok(Math.max(...ctaChannels) < 220, `${name} ${route} header CTA is too bright`);
        assert.ok(Math.min(...toplineChannels) > 120, `${name} ${route} topline text is too dark`);
        assert.ok(Math.min(...inputChannels) > 180, `${name} ${route} input text is too dark`);
        assert.ok(Math.max(...inputBackground) < 45, `${name} ${route} input background is too bright`);
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

  const codePanels = {
    signup: await exerciseCodePanel(page, 'signup'),
    login: await exerciseCodePanel(page, 'login'),
    recovery: await exerciseRecoveryCodePanel(page),
  };
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
    codePanels,
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
