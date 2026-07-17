#!/usr/bin/env node

import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const USER_AGENT = 'AccessRevampAudit/1.0 (+public-homepage-review; no form submission)';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_NODES_PER_RULE = 20;

function parseArgs(argv) {
  const args = { out: '', url: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--url') args.url = argv[++index] || '';
    else if (value === '--out') args.out = argv[++index] || '';
    else if (value === '--help' || value === '-h') args.help = true;
    else if (!args.url) args.url = value;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  npm run scan -- --url https://store.example --out artifacts/scans/store-example',
    '',
    'The scanner only retrieves a public page and its normal GET/HEAD subresources.',
    'It does not click, submit forms, create accounts, open checkout, or test private routes.',
  ].join('\n');
}

function isPrivateIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
}

function isPrivateIpv6(address) {
  const normalized = address.toLowerCase().split('%')[0];
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
  if (normalized.startsWith('ff') || normalized.startsWith('2001:db8:')) return true;
  if (normalized.startsWith('::ffff:')) return isPrivateIpv4(normalized.slice(7));
  return false;
}

function isPrivateAddress(address) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

const hostnameCache = new Map();
async function assertPublicHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  if (!normalized || normalized === 'localhost' || /\.(?:localhost|local|internal|test|example|invalid)$/.test(normalized)) {
    throw new Error(`Blocked non-public hostname: ${hostname}`);
  }
  if (isIP(normalized)) {
    if (isPrivateAddress(normalized)) throw new Error(`Blocked private or reserved address: ${hostname}`);
    return;
  }
  if (!hostnameCache.has(normalized)) {
    hostnameCache.set(normalized, (async () => {
      const records = await lookup(normalized, { all: true, verbatim: true });
      if (!records.length) throw new Error(`No public DNS records were found for ${hostname}`);
      for (const record of records) {
        if (isPrivateAddress(record.address)) {
          throw new Error(`Blocked ${hostname}: DNS resolved to a private or reserved address.`);
        }
      }
    })());
  }
  await hostnameCache.get(normalized);
}

async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Enter a complete public HTTP(S) URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only public HTTP(S) URLs are supported.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Only standard public web ports 80 and 443 are allowed.');
  url.hash = '';
  await assertPublicHostname(url.hostname);
  return url;
}

function safeSlug(url) {
  return url.hostname.replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'scan';
}

function pruneAxeResult(result) {
  return {
    testEngine: result.testEngine,
    testRunner: result.testRunner,
    testEnvironment: result.testEnvironment,
    timestamp: result.timestamp,
    url: result.url,
    violations: result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      tags: violation.tags,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.slice(0, MAX_NODES_PER_RULE).map((node) => ({
        impact: node.impact,
        target: node.target,
        html: node.html.slice(0, 1_000),
        failureSummary: node.failureSummary,
      })),
      omittedNodeCount: Math.max(0, violation.nodes.length - MAX_NODES_PER_RULE),
    })),
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.url) {
  console.log(usage());
  process.exit(args.help ? 0 : 1);
}

const requestedUrl = await assertPublicUrl(args.url);
const outputDirectory = resolve(args.out || `artifacts/scans/${safeSlug(requestedUrl)}-${Date.now()}`);
await mkdir(outputDirectory, { recursive: true });

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  throw new Error(`Chromium is not installed for Playwright. Run "npx playwright install chromium" once. ${error.message}`);
}

try {
  const context = await browser.newContext({
    acceptDownloads: false,
    bypassCSP: false,
    colorScheme: 'light',
    javaScriptEnabled: true,
    locale: 'en-US',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    userAgent: USER_AGENT,
    viewport: { width: 1440, height: 1100 },
  });

  await context.route('**/*', async (route) => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method())) return route.abort('blockedbyclient');
    let resourceUrl;
    try {
      resourceUrl = new URL(request.url());
    } catch {
      return route.abort('blockedbyclient');
    }
    if (['data:', 'blob:'].includes(resourceUrl.protocol)) return route.continue();
    if (!['http:', 'https:'].includes(resourceUrl.protocol)) return route.abort('blockedbyclient');
    try {
      await assertPublicHostname(resourceUrl.hostname);
      return route.continue();
    } catch {
      return route.abort('blockedbyclient');
    }
  });

  const page = await context.newPage();
  page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));

  const response = await page.goto(requestedUrl.toString(), { waitUntil: 'domcontentloaded' });
  if (!response) throw new Error('The page did not return an HTTP response.');
  const finalUrl = await assertPublicUrl(page.url());
  if (response.status() >= 400) throw new Error(`The homepage returned HTTP ${response.status()}.`);

  await page.waitForTimeout(750);
  const screenshotPath = resolve(outputDirectory, 'homepage.png');
  await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });

  const axe = pruneAxeResult(await new AxeBuilder({ page }).analyze());
  const deterministic = await page.evaluate(() => {
    const visibleText = (element) => (element.getAttribute('aria-label') || element.textContent || '').trim();
    const controls = [...document.querySelectorAll('input, select, textarea')].map((element) => ({
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute('type') || '',
      id: element.id || '',
      name: element.getAttribute('name') || '',
      hasAccessibleName: Boolean(
        element.getAttribute('aria-label')
        || element.getAttribute('aria-labelledby')
        || (element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`))
        || element.closest('label'),
      ),
    }));
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      title: document.title,
      lang: document.documentElement.lang || '',
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((element) => ({
        level: Number(element.tagName.slice(1)),
        text: visibleText(element).slice(0, 300),
      })),
      landmarks: [...document.querySelectorAll('header,nav,main,aside,footer,[role="banner"],[role="navigation"],[role="main"],[role="complementary"],[role="contentinfo"]')]
        .map((element) => element.getAttribute('role') || element.tagName.toLowerCase()),
      images: [...document.images].map((image) => ({
        src: image.currentSrc || image.src,
        altPresent: image.hasAttribute('alt'),
        alt: image.getAttribute('alt'),
      })),
      controls,
      unnamedLinks: [...document.querySelectorAll('a[href]')].filter((link) => !visibleText(link)).length,
      unnamedButtons: [...document.querySelectorAll('button')].filter((button) => !visibleText(button)).length,
      timing: navigation ? {
        domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
        loadEventMs: Math.round(navigation.loadEventEnd),
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize,
      } : null,
    };
  });

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    requestedUrl: requestedUrl.toString(),
    finalUrl: finalUrl.toString(),
    httpStatus: response.status(),
    screenshot: basename(screenshotPath),
    reviewStatus: 'candidate_needs_human_review',
    limitations: [
      'Automated results are leads, not customer-facing conclusions.',
      'No forms were submitted, no links were clicked, and no authenticated or checkout area was tested.',
      'A qualified person must verify context, severity, affected users, WCAG mapping, and proposed repairs.',
    ],
    page: deterministic,
    axe,
  };

  await writeFile(resolve(outputDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    outputDirectory,
    finalUrl: report.finalUrl,
    candidateViolationCount: report.axe.violations.length,
    reviewStatus: report.reviewStatus,
  }, null, 2));
} finally {
  await browser.close();
}
