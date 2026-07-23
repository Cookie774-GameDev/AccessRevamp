const MAX_BODY_BYTES = 16_000;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export function html(markup, status = 200) {
  return new Response(markup, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

export function requestIp(request) {
  return request.headers.get('x-nf-client-connection-ip')
    || request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

export function assertJsonSize(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_BYTES) throw new HttpError(413, 'Request is too large.');
}

export async function readJsonBody(request) {
  const contentType = (request.headers.get('content-type') || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== 'application/json') {
    throw new HttpError(415, 'Content-Type must be application/json.');
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new HttpError(413, 'Request is too large.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(422, 'Request body must be valid JSON.');
  }
}

export function assertMethod(request, method) {
  if (request.method !== method) throw new HttpError(405, 'Method not allowed.');
}

export function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) throw new HttpError(403, 'A valid browser origin is required.');
  const allowed = new Set([
    'https://accessrevamp.com',
    'https://www.accessrevamp.com',
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.VITE_SITE_URL,
    process.env.ACCESSREVAMP_SITE_URL,
    ...(process.env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()),
  ].filter(Boolean).map((value) => value.replace(/\/$/, '')));
  if (!allowed.has(origin.replace(/\/$/, ''))) throw new HttpError(403, 'Origin is not allowed.');
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function handleError(error) {
  const status = Number(error?.status) || 500;
  const message = status >= 500 ? 'The request could not be completed.' : error.message;
  if (status >= 500) {
    const name = String(error?.name || 'Error').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
    console.error('AccessRevamp server request failed.', { status, name });
  }
  return json({ error: message }, status);
}
