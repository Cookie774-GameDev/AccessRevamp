import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist');
const portFlag = process.argv.indexOf('--port');
const port = Number(portFlag >= 0 ? process.argv[portFlag + 1] : process.env.PORT || 4173);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'], ['.avif', 'image/avif'], ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'], ['.txt', 'text/plain; charset=utf-8'],
  ['.mp4', 'video/mp4'], ['.webm', 'video/webm'], ['.mp3', 'audio/mpeg'], ['.wav', 'audio/wav'],
]);

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid preview port.');

function existingFile(pathname) {
  const candidate = resolve(root, `.${pathname}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  try { return statSync(candidate).isFile() ? candidate : null; } catch { return null; }
}

function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value || '');
  if (!match || (!match[1] && !match[2])) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return null;
  return { start, end: Math.min(end, size - 1) };
}

const server = createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || '')) {
    response.writeHead(405, { allow: 'GET, HEAD' }); response.end(); return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url || '/', 'http://preview.local').pathname); }
  catch { response.writeHead(400); response.end('Bad request'); return; }

  const requestedFile = existingFile(pathname);
  const file = requestedFile || (!extname(pathname) ? existingFile('/index.html') : null);
  if (!file) { response.writeHead(404); response.end('Not found'); return; }

  const stats = statSync(file);
  const mediaType = types.get(extname(file).toLowerCase()) || 'application/octet-stream';
  const baseHeaders = {
    'content-type': mediaType,
    'cache-control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'accept-ranges': 'bytes',
  };

  const requestedRange = request.headers.range;
  const range = requestedRange ? parseRange(requestedRange, stats.size) : null;
  if (requestedRange && !range) {
    response.writeHead(416, { ...baseHeaders, 'content-range': `bytes */${stats.size}`, 'content-length': '0' });
    response.end();
    return;
  }

  const status = range ? 206 : 200;
  const start = range?.start ?? 0;
  const end = range?.end ?? stats.size - 1;
  const headers = {
    ...baseHeaders,
    'content-length': String(Math.max(0, end - start + 1)),
    ...(range ? { 'content-range': `bytes ${start}-${end}/${stats.size}` } : {}),
  };
  response.writeHead(status, headers);
  if (request.method === 'HEAD') { response.end(); return; }

  const stream = createReadStream(file, { start, end });
  stream.on('error', () => {
    if (!response.headersSent) response.writeHead(500);
    response.end('Internal server error');
  });
  response.on('error', () => {
    // Silent catch to prevent process crash on EPIPE/ECONNRESET when connection is closed.
  });
  stream.pipe(response);
});

server.listen(port, '127.0.0.1', () => process.stdout.write(`AccessRevamp preview: http://127.0.0.1:${port}\n`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
