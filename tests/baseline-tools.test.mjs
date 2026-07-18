import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyLighthouseResult } from '../scripts/lib/lighthouse-result.mjs';
import { isAccessRevampDocument } from '../scripts/lib/baseline-server.mjs';
import { commandInvocation, executableForPlatform } from '../scripts/lib/command-platform.mjs';
import { redactEvidence } from '../scripts/lib/evidence-redaction.mjs';

test('browser evidence recursively redacts payment identifiers and direct checkout links', () => {
  assert.deepEqual(redactEvidence({
    html: '<a href="https://book.stripe.com/test_example">Buy</a>',
    nested: ['price_example', 'whsec_example', 'safe'],
  }), {
    html: '<a href="[redacted-stripe-checkout-url]">Buy</a>',
    nested: ['[redacted-stripe-price-id]', '[redacted-stripe-webhook-secret]', 'safe'],
  });
});

test('Windows command capture resolves npm through its command shim', () => {
  assert.equal(executableForPlatform('npm', 'win32'), 'npm.cmd');
  assert.equal(executableForPlatform('git', 'win32'), 'git');
  assert.equal(executableForPlatform('npm', 'linux'), 'npm');
  assert.deepEqual(commandInvocation('npm', ['--version'], 'win32', 'cmd.exe'), {
    executable: 'cmd.exe',
    args: ['/d', '/s', '/c', 'npm.cmd', '--version'],
  });
});

test('the baseline server identity check rejects an unrelated page', () => {
  assert.equal(isAccessRevampDocument('<title>Another site</title><div id="app"></div>'), false);
  assert.equal(
    isAccessRevampDocument('<title>AccessRevamp — Make the next click feel obvious</title><div id="app"></div>'),
    true,
  );
});

test('a valid Lighthouse report remains captured when Windows profile cleanup fails', () => {
  const report = JSON.stringify({
    lighthouseVersion: '13.4.0',
    categories: {
      performance: { score: 0.34 },
      accessibility: { score: 0.83 },
      'best-practices': { score: 1 },
      seo: { score: 1 },
    },
  });
  const stderr = 'Error: EPERM, Permission denied: C:\\Temp\\lighthouse.123';

  assert.deepEqual(classifyLighthouseResult({ exitCode: 1, report, stderr }), {
    status: 'captured-with-cleanup-warning',
    lighthouseVersion: '13.4.0',
    scores: {
      performance: 34,
      accessibility: 83,
      bestPractices: 100,
      seo: 100,
    },
    warning: 'Lighthouse produced a valid report but could not remove its temporary Chrome profile.',
  });
});

test('an invalid Lighthouse payload remains a failed audit', () => {
  assert.deepEqual(classifyLighthouseResult({ exitCode: 1, report: '{bad json', stderr: 'runtime failure' }), {
    status: 'failed',
    reason: 'runtime failure',
  });
});

test('a Lighthouse runtime error is not mistaken for a captured audit', () => {
  const report = JSON.stringify({
    lighthouseVersion: '13.4.0',
    runtimeError: {
      code: 'ERRORED_DOCUMENT_REQUEST',
      message: 'Lighthouse could not load the requested page. (Status code: 404)',
    },
    categories: {
      performance: { score: null },
      accessibility: { score: null },
      'best-practices': { score: null },
      seo: { score: null },
    },
  });

  assert.deepEqual(classifyLighthouseResult({ exitCode: 1, report, stderr: '' }), {
    status: 'failed',
    reason: 'ERRORED_DOCUMENT_REQUEST: Lighthouse could not load the requested page. (Status code: 404)',
  });
});
