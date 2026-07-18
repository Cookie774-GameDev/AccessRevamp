import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const scanner = await readFile('scripts/scan-public-homepage.mjs', 'utf8');

test('scanner re-checks DNS instead of trusting a persistent hostname cache', () => {
  assert.match(scanner, /const inFlightHostnameLookups = new Map\(\)/);
  assert.match(scanner, /inFlightHostnameLookups\.delete\(normalized\)/);
  assert.doesNotMatch(scanner, /const hostnameCache = new Map\(\)/);
});

test('scanner blocks additional IPv4 and IPv6 reserved ranges', () => {
  assert.match(scanner, /a === 198 && b === 51 && c === 100/);
  assert.match(scanner, /a === 203 && b === 0 && c === 113/);
  assert.match(scanner, /\['::ffff:0:0', 96\]/);
  assert.match(scanner, /\['fc00::', 7\]/);
  assert.match(scanner, /\['fe80::', 10\]/);
});

test('scanner blocks WebSocket egress and state-changing HTTP methods', () => {
  assert.match(scanner, /\['GET', 'HEAD'\]/);
  assert.match(scanner, /routeWebSocket\('\*\*\/\*'/);
  assert.match(scanner, /webSocket\.close\(\)/);
});

test('scanner bounds main-document, DOM, collection, and screenshot size', () => {
  assert.match(scanner, /MAX_MAIN_DOCUMENT_BYTES = 12_000_000/);
  assert.match(scanner, /MAX_DOM_ELEMENTS = 50_000/);
  assert.match(scanner, /MAX_COLLECTION_ITEMS = 250/);
  assert.match(scanner, /MAX_SCREENSHOT_HEIGHT = 6_000/);
  assert.match(scanner, /contentLength > MAX_MAIN_DOCUMENT_BYTES/);
  assert.match(scanner, /pageShape\.domElementCount > MAX_DOM_ELEMENTS/);
  assert.match(scanner, /Math\.min\(MAX_SCREENSHOT_HEIGHT/);
  assert.doesNotMatch(scanner, /fullPage:\s*true/);
});

test('scanner caps extracted values and records truncation metadata', () => {
  assert.match(scanner, /slice\(0, 2_048\)/);
  assert.match(scanner, /omittedItems/);
  assert.match(scanner, /screenshotCapture/);
  assert.match(scanner, /boundedScan/);
  assert.match(scanner, /schemaVersion: 2/);
});
