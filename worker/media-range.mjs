const RANGE_HEADER = /^bytes=(\d*)-(\d*)$/i;

const parseByteRange = (value, length) => {
  const match = RANGE_HEADER.exec(value?.trim() || '');
  if (!match || length <= 0) return null;

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(0, length - suffixLength), end: length - 1 };
  }

  const start = Number(rawStart);
  const requestedEnd = rawEnd ? Number(rawEnd) : length - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd)
    || start < 0 || requestedEnd < start || start >= length) return null;

  return { start, end: Math.min(requestedEnd, length - 1) };
};

const responseHeaders = (source) => {
  const headers = new Headers(source.headers);
  headers.delete('Content-Encoding');
  headers.delete('Content-Length');
  headers.delete('Content-Range');
  headers.set('Accept-Ranges', 'bytes');
  return headers;
};

export async function createMediaRangeResponse(request, source) {
  if (request.method !== 'GET' || !request.headers.has('Range') || !source.ok) return source;

  const body = new Uint8Array(await source.arrayBuffer());
  const headers = responseHeaders(source);
  const range = parseByteRange(request.headers.get('Range'), body.byteLength);

  if (!range) {
    headers.set('Content-Range', `bytes */${body.byteLength}`);
    headers.set('Content-Length', '0');
    return new Response(null, { status: 416, statusText: 'Range Not Satisfiable', headers });
  }

  const partialBody = body.slice(range.start, range.end + 1);
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${body.byteLength}`);
  headers.set('Content-Length', String(partialBody.byteLength));
  return new Response(partialBody, { status: 206, statusText: 'Partial Content', headers });
}
