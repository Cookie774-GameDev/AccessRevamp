#!/usr/bin/env node

import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const USER_AGENT = 'AccessRevampAudit/1.1 (+public-homepage-review; no form submission)';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_NODES_PER_RULE = 20;
const MAX_COLLECTION_ITEMS = 250;
const MAX_DOM_ELEMENTS = 50_000;
const MAX_MAIN_DOCUMENT_BYTES = 12_000_000;
const MAX_SCREENSHOT_HEIGHT = 6_000;

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
  const [a, b, c] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 88 && c === 99)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

function ipv4ToHextets(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return [((parts[0] << 8) | parts[1]).toString(16), ((parts[2] << 8) | parts[3]).toString(16)];
}

function parseIpv6(address) {
  let normalized = address.toLowerCase().split('%')[0].replace(/^\[|\]$/g, '');
  if (normalized.includes('.')) {
    const finalColon = normalized.lastIndexOf(':');
    const hextets = ipv4ToHextets(normalized.slice(finalColon + 1));
    if (!hextets) return null;
    normalized = `${normalized.slice(0, finalColon)}:${hextets.join(':')}`;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;

  const parts = halves.length === 2
    ? [...left, ...Array(missing).fill('0'), ...right]
    : left;
  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;

  return parts.reduce((value, part) => (value << 16n) | BigInt(`0x${part}`), 0n);
}

function ipv6InCidr(addressValue, prefixValue, prefixLength) {
  const shift = 128n - BigInt(prefixLength);
  return (addressValue >> shift) === (prefixValue >> shift);
}

const BLOCKED_IPV6_CIDRS = [
  ['::', 128],
  ['::1', 128],
  ['::', 96],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
  ['5f00::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
].map(([prefix, length]) => [parseIpv6(prefix), length]);

function isPrivateIpv6(address) {
  const value = parseIpv6(address);
  if (value === null) return true;
  return BLOCKED_IPV6_CIDRS.some(([prefix, length]) => prefix !== null && ipv6InCidr(value, prefix, length));
}

function isPrivateAddress(address) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

const inFlightHostnameLookups = new Map();
async function assertPublicHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  if (!normalized || normalized === 'localhost' || /\.(?:localhost|local|internal|test|example|invalid)$/.test(normalized)) {
    throw new Error(`Blocked non-public hostname: ${hostname}`);
  }
  if (isIP(normalized)) {
    if (isPrivateAddress(normalized)) throw new Error(`Blocked private or reserved address: ${hostname}`);
    return;
  }

  let lookupPromise = inFlightHostnameLookups.get(normalized);
  if (!lookupPromise) {
    lookupPromise = (async () => {
      const records = await lookup(normalized, { all: true, verbatim: true });
      if (!records.length) throw new Error(`No public DNS records were found for ${hostname}`);
      for (const record of records) {
        if (isPrivateAddress(record.address)) {
          throw new Error(`Blocked ${hostname}: DNS resolved to a private or reserved address.`);
        }
      }
    })();
    inFlightHostnameLookups.set(normalized, lookupPromise);
  }

  try {
    await lookupPromise;
  } finally {
    if (inFlightHostnameLookups.get(normalized) === lookupPromise) {
      inFlightHostnameLookups.delete(normalized);
    }
  }
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

  await context.routeWebSocket('**/*', (webSocket) => webSocket.close());

  const page = await context.newPage();
  context.on('page', (candidate) => {
    if (candidate !== page) candidate.close().catch(() => {});
  });
  page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));

  const response = await page.goto(requestedUrl.toString(), { waitUntil: 'domcontentloaded' });
  if (!response) throw new Error('The page did not return an HTTP response.');
  const finalUrl = await assertPublicUrl(page.url());
  if (response.status() >= 400) throw new Error(`The homepage returned HTTP ${response.status()}.`);

  const contentLength = Number.parseInt(response.headers()['content-length'] || '0', 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_MAIN_DOCUMENT_BYTES) {
    throw new Error(`The homepage document exceeds the ${MAX_MAIN_DOCUMENT_BYTES}-byte scan limit.`);
  }

  await page.waitForTimeout(750);
  const pageShape = await page.evaluate(() => ({
    domElementCount: document.getElementsByTagName('*').length,
    documentHeight: Math.max(
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
      document.body?.scrollHeight || 0,
      document.body?.offsetHeight || 0,
      window.innerHeight,
    ),
  }));
  if (pageShape.domElementCount > MAX_DOM_ELEMENTS) {
    throw new Error(`The homepage contains more than ${MAX_DOM_ELEMENTS} elements and exceeds the bounded scan limit.`);
  }

  const screenshotPath = resolve(outputDirectory, 'homepage.png');
  const capturedHeight = Math.min(MAX_SCREENSHOT_HEIGHT, Math.max(1, pageShape.documentHeight));
  await page.screenshot({
    path: screenshotPath,
    clip: { x: 0, y: 0, width: 1440, height: capturedHeight },
    animations: 'disabled',
    caret: 'hide',
  });

  const axe = pruneAxeResult(await new AxeBuilder({ page }).analyze());
  const deterministic = await page.evaluate(({ maxItems }) => {
    const visibleText = (element) => (element.getAttribute('aria-label') || element.textContent || '').trim();
    const collect = (selector, mapper) => {
      const nodes = document.querySelectorAll(selector);
      const items = [];
      for (let index = 0; index < Math.min(nodes.length, maxItems); index += 1) {
        items.push(mapper(nodes[index]));
      }
      return { items, total: nodes.length, omitted: Math.max(0, nodes.length - items.length) };
    };

    const headings = collect('h1,h2,h3,h4,h5,h6', (element) => ({
      level: Number(element.tagName.slice(1)),
      text: visibleText(element).slice(0, 300),
    }));
    const landmarks = collect('header,nav,main,aside,footer,[role="banner"],[role="navigation"],[role="main"],[role="complementary"],[role="contentinfo"]', (element) => (
      element.getAttribute('role') || element.tagName.toLowerCase()
    ));
    const images = collect('img', (image) => ({
      src: String(image.currentSrc || image.src || '').slice(0, 2_048),
      altPresent: image.hasAttribute('alt'),
      alt: image.getAttribute('alt')?.slice(0, 1_000) ?? null,
    }));
    const controls = collect('input, select, textarea', (element) => ({
      tag: element.tagName.toLowerCase(),
      type: (element.getAttribute('type') || '').slice(0, 80),
      id: (element.id || '').slice(0, 200),
      name: (element.getAttribute('name') || '').slice(0, 200),
      hasAccessibleName: Boolean(
        element.getAttribute('aria-label')
        || element.getAttribute('aria-labelledby')
        || (element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`))
        || element.closest('label'),
      ),
    }));

    let unnamedLinks = 0;
    for (const link of document.querySelectorAll('a[href]')) if (!visibleText(link)) unnamedLinks += 1;
    let unnamedButtons = 0;
    for (const button of document.querySelectorAll('button')) if (!visibleText(button)) unnamedButtons += 1;

    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      title: document.title.slice(0, 300),
      lang: (document.documentElement.lang || '').slice(0, 40),
      headings: headings.items,
      landmarks: landmarks.items,
      images: images.items,
      controls: controls.items,
      omittedItems: {
        headings: headings.omitted,
        landmarks: landmarks.omitted,
        images: images.omitted,
        controls: controls.omitted,
      },
      unnamedLinks,
      unnamedButtons,
      timing: navigation ? {
        domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
        loadEventMs: Math.round(navigation.loadEventEnd),
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize,
      } : null,
    };
  }, { maxItems: MAX_COLLECTION_ITEMS });

  const report = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    requestedUrl: requestedUrl.toString(),
    finalUrl: finalUrl.toString(),
    httpStatus: response.status(),
    screenshot: basename(screenshotPath),
    screenshotCapture: {
      capturedHeight,
      documentHeight: pageShape.documentHeight,
      truncated: pageShape.documentHeight > capturedHeight,
    },
    boundedScan: {
      domElementCount: pageShape.domElementCount,
      maxDomElements: MAX_DOM_ELEMENTS,
      maxCollectionItems: MAX_COLLECTION_ITEMS,
      maxMainDocumentBytes: MAX_MAIN_DOCUMENT_BYTES,
    },
    reviewStatus: 'candidate_needs_human_review',
    limitations: [
      'Automated results are leads, not customer-facing conclusions.',
      'No forms were submitted, no links were clicked, no WebSocket connection was allowed, and no authenticated or checkout area was tested.',
      'Large documents, DOMs, screenshots, and extracted collections are intentionally bounded for safe review.',
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
    screenshotTruncated: report.screenshotCapture.truncated,
  }, null, 2));
} finally {
  await browser.close();
}
