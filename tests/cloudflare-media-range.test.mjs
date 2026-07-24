import test from 'node:test';
import assert from 'node:assert/strict';

let createMediaRangeResponse;
try {
  ({ createMediaRangeResponse } = await import('../worker/media-range.mjs'));
} catch (error) {
  createMediaRangeResponse = () => assert.fail(`Range-response helper must exist: ${error.message}`);
}

const sourceResponse = () => new Response(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), {
  headers: {
    'Content-Type': 'video/mp4',
    'Cache-Control': 'public, max-age=3600',
    ETag: '"showcase-test"',
  },
});

test('showcase media honors a valid single byte range', async () => {
  const request = new Request('https://accessrevamp.com/media/showcases/verdant-normal.mp4', {
    headers: { Range: 'bytes=3-6' },
  });
  const response = await createMediaRangeResponse(request, sourceResponse());

  assert.equal(response.status, 206);
  assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
  assert.equal(response.headers.get('Content-Range'), 'bytes 3-6/10');
  assert.equal(response.headers.get('Content-Length'), '4');
  assert.equal(response.headers.get('Content-Type'), 'video/mp4');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [3, 4, 5, 6]);
});

test('showcase media rejects a range beyond the asset length', async () => {
  const request = new Request('https://accessrevamp.com/media/showcases/verdant-normal.mp4', {
    headers: { Range: 'bytes=10-12' },
  });
  const response = await createMediaRangeResponse(request, sourceResponse());

  assert.equal(response.status, 416);
  assert.equal(response.headers.get('Content-Range'), 'bytes */10');
  assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
});
