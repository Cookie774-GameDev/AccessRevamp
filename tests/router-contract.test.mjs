import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import * as routerModule from '../src/app/router.js';
import { routeMetadata, updateDocumentMetadata } from '../src/app/metadata.js';
import { portfolioUnderConstructionPage, underConstructionPage } from '../src/pages/under-construction.js';

const REQUIRED_ROUTES = [
  '/',
  '/process',
  '/pricing',
  '/portfolio',
  '/portfolio/:slug',
  '/free-snapshot',
  '/sample-report',
  '/methodology',
  '/outreach-standards',
  '/contact',
  '/login',
  '/signup',
  '/account/projects',
  '/success',
  '/cancel',
  '/refunds',
  '/privacy',
  '/terms',
  '/accessibility',
  '/preview/:token',
];

const LEGACY_ROUTES = [
  '/work',
  '/work/:slug',
  '/services',
  '/dashboard',
  '/legal',
  '/cinematic-scroll',
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('main registers every required route while retaining legacy routes', async () => {
  const mainSource = await readFile('src/main.js', 'utf8');

  for (const route of [...REQUIRED_ROUTES, ...LEGACY_ROUTES]) {
    assert.match(mainSource, new RegExp(`['"]${escapeRegExp(route)}['"]`), `missing route pattern ${route}`);
  }
});

test('route metadata covers the required declarative inventory', () => {
  for (const route of REQUIRED_ROUTES) {
    assert.ok(routeMetadata[route], `missing metadata for ${route}`);
  }
});

test('the route matcher exports a compiled segment API', () => {
  assert.equal(typeof routerModule.compileRoute, 'function');
  assert.equal(typeof routerModule.matchRoute, 'function');
});

test('dynamic routes decode token and slug parameters', () => {
  const preview = routerModule.matchRoute('/preview/abc123', { '/preview/:token': () => '' });
  const portfolio = routerModule.matchRoute('/portfolio/greenline-lawn-and-grounds', { '/portfolio/:slug': () => '' });

  assert.deepEqual(preview.params, { token: 'abc123' });
  assert.deepEqual(portfolio.params, { slug: 'greenline-lawn-and-grounds' });
  assert.deepEqual(
    routerModule.matchRoute('/preview/review%20token', { '/preview/:token': () => '' }).params,
    { token: 'review token' },
  );
});

test('route compilation escapes literal segments', () => {
  const routes = { '/release/v1.0/:slug': () => '' };

  assert.equal(routerModule.matchRoute('/release/v1x0/example', routes), null);
  assert.deepEqual(routerModule.matchRoute('/release/v1.0/example', routes).params, { slug: 'example' });
});

test('malformed parameter encoding is safe and remains available verbatim', () => {
  assert.deepEqual(
    routerModule.matchRoute('/preview/%E0%A4%A', { '/preview/:token': () => '' }).params,
    { token: '%E0%A4%A' },
  );
});

test('dynamic routes reject missing and extra segments', () => {
  const routes = { '/portfolio/:slug': () => '' };

  assert.equal(routerModule.matchRoute('/portfolio', routes), null);
  assert.equal(routerModule.matchRoute('/portfolio/example/details', routes), null);
});

test('placeholder views render the exact portfolio disclosure only for portfolio demos', () => {
  const disclosure = 'Original working demo — not a client engagement.';

  assert.equal(typeof portfolioUnderConstructionPage, 'function', 'portfolio placeholder must be importable');
  assert.equal(typeof underConstructionPage, 'function', 'generic placeholder must be importable');

  const portfolioHtml = portfolioUnderConstructionPage();
  const genericHtml = underConstructionPage();

  assert.match(portfolioHtml, new RegExp(escapeRegExp(disclosure)));
  assert.match(portfolioHtml, /under construction in this preview/i);
  assert.doesNotMatch(genericHtml, new RegExp(escapeRegExp(disclosure)));
});

test('main binds portfolio and generic placeholders to their intended routes', async () => {
  const mainSource = await readFile('src/main.js', 'utf8');

  assert.match(mainSource, /'\/portfolio\/:slug': portfolioUnderConstructionPage/);
  assert.match(mainSource, /'\/free-snapshot': underConstructionPage/);
  assert.match(mainSource, /'\/preview\/:token': underConstructionPage/);
});

test('router navigation preserves history, popstate rendering, and route cleanup', () => {
  const originalGlobals = new Map();
  for (const name of ['document', 'window', 'location', 'history', 'matchMedia']) {
    originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }

  const documentListeners = new Map();
  const windowListeners = new Map();
  const rendered = [];
  const cleaned = [];
  const pushed = [];
  const location = { origin: 'https://accessrevamp.test', pathname: '/' };

  Object.defineProperties(globalThis, {
    document: {
      configurable: true,
      value: {
        addEventListener: (type, handler) => documentListeners.set(type, handler),
        removeEventListener: (type) => documentListeners.delete(type),
      },
    },
    window: {
      configurable: true,
      value: {
        addEventListener: (type, handler) => windowListeners.set(type, handler),
        removeEventListener: (type) => windowListeners.delete(type),
        scrollTo: () => {},
      },
    },
    location: { configurable: true, value: location },
    history: {
      configurable: true,
      value: {
        pushState(_state, _title, path) {
          pushed.push(path);
          location.pathname = new URL(path, location.origin).pathname;
        },
        replaceState(_state, _title, path) {
          location.pathname = new URL(path, location.origin).pathname;
        },
      },
    },
    matchMedia: { configurable: true, value: () => ({ matches: true }) },
  });

  try {
    const instance = routerModule.createRouter({
      routes: {
        '/': () => '',
        '/preview/:token': () => '',
      },
      fallback: () => '',
      render({ pathname, params }) {
        rendered.push({ pathname, params });
        return () => cleaned.push(pathname);
      },
    });

    instance.start();
    instance.navigate('/preview/abc123?mode=review#top');
    location.pathname = '/';
    windowListeners.get('popstate')();
    instance.destroy();

    assert.deepEqual(pushed, ['/preview/abc123?mode=review#top']);
    assert.deepEqual(rendered, [
      { pathname: '/', params: {} },
      { pathname: '/preview/abc123', params: { token: 'abc123' } },
      { pathname: '/', params: {} },
    ]);
    assert.deepEqual(cleaned, ['/', '/preview/abc123', '/']);
    assert.equal(documentListeners.has('click'), false);
    assert.equal(windowListeners.has('popstate'), false);
  } finally {
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});

test('preview metadata is token-independent and restores indexable robots metadata', () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const description = {
    content: '',
    setAttribute(name, value) {
      if (name === 'content') this.content = value;
    },
  };
  const robots = {
    content: 'index,follow,max-image-preview:large',
    setAttribute(name, value) {
      if (name === 'content') this.content = value;
    },
  };
  const fakeDocument = {
    title: '',
    querySelector(selector) {
      if (selector === 'meta[name="description"]') return description;
      if (selector === 'meta[name="robots"]') return robots;
      return null;
    },
  };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: fakeDocument });

  try {
    updateDocumentMetadata('/preview/private-token-value', '/preview/:token');

    assert.equal(fakeDocument.title, 'Private preview | AccessRevamp');
    assert.equal(description.content, 'A private AccessRevamp review preview.');
    assert.equal(robots.content, 'noindex,nofollow');
    assert.doesNotMatch(`${fakeDocument.title}\n${description.content}`, /private-token-value/);

    updateDocumentMetadata('/pricing');
    assert.equal(robots.content, 'index,follow,max-image-preview:large');
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete globalThis.document;
  }
});
