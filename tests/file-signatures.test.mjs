import assert from 'node:assert/strict';
import test from 'node:test';
import { assertVerifiedImage } from '../netlify/functions/_shared/file-signatures.mjs';

test('verified image signatures accept matching bytes', () => {
  assert.doesNotThrow(() => assertVerifiedImage(
    { type: 'image/png' },
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ));
  assert.doesNotThrow(() => assertVerifiedImage(
    { type: 'image/jpeg' },
    Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]),
  ));
});

test('a spoofed MIME type is rejected', () => {
  assert.throws(
    () => assertVerifiedImage({ type: 'image/png' }, new TextEncoder().encode('<script>alert(1)</script>')),
    /did not match/i,
  );
  assert.throws(
    () => assertVerifiedImage({ type: 'application/pdf' }, Uint8Array.from([0x25, 0x50, 0x44, 0x46])),
    /must be JPEG/i,
  );
});
