import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPrivateToken,
  hashPreviewToken,
  createUnsubscribeToken,
  readUnsubscribeToken,
} from '../netlify/functions/_shared/secure-tokens.mjs';

const previewSecret = 'p'.repeat(40);
const unsubscribeSecret = 'u'.repeat(40);

test('private preview tokens are high-entropy URL-safe values', () => {
  const first = createPrivateToken();
  const second = createPrivateToken();
  assert.match(first, /^[A-Za-z0-9_-]{32,128}$/);
  assert.match(second, /^[A-Za-z0-9_-]{32,128}$/);
  assert.notEqual(first, second);
});

test('preview token hashes are keyed and deterministic', () => {
  const token = createPrivateToken();
  const first = hashPreviewToken(token, previewSecret);
  const second = hashPreviewToken(token, previewSecret);
  const otherKey = hashPreviewToken(token, 'q'.repeat(40));
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, otherKey);
});

test('signed unsubscribe tokens round-trip without exposing a secret', () => {
  const payload = {
    messageId: '00000000-0000-0000-0000-000000000000',
    email: 'hello@example.com',
  };
  const token = createUnsubscribeToken(payload, unsubscribeSecret);
  assert.deepEqual(readUnsubscribeToken(token, unsubscribeSecret), payload);
  assert.doesNotMatch(token, new RegExp(unsubscribeSecret));
});

test('tampered unsubscribe tokens are rejected', () => {
  const token = createUnsubscribeToken({ messageId: 'x', email: 'a@example.com' }, unsubscribeSecret);
  const [payload, signature] = token.split('.');
  const tampered = `${payload}.${signature.slice(0, -1)}${signature.endsWith('A') ? 'B' : 'A'}`;
  assert.throws(() => readUnsubscribeToken(tampered, unsubscribeSecret), /Invalid unsubscribe token/);
});

test('short or missing secrets fail closed', () => {
  const token = createPrivateToken();
  assert.throws(() => hashPreviewToken(token, 'too-short'), /at least 32 random characters/);
  assert.throws(
    () => createUnsubscribeToken({ messageId: 'x', email: 'a@example.com' }, ''),
    /at least 32 random characters/,
  );
});
