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
  ['.png', 'image/png'], ['.webp', 'image/webp'], ['.avif', 'image/avif'],
  ['.ico', 'image/x-icon'], ['.woff2', 'font/woff2'], ['.txt', 'text/plain; charset=utf-8']
]);

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid preview port.');

function existingFile(pathname) {
  const candidate = resolve(root, `.${pathname}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  try { return statSync(candidate).isFile() ? candidate : null; } catch { return null; }
}

const server = createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || '')) {
    response.writeHead(405, { allow: 'GET, HEAD' }); response.end(); return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url || '/', 'http://preview.local').pathname); }
  catch { response.writeHead(400); response.end('Bad request'); return; }
  const file = existingFile(pathname) || existingFile('/index.html');
  if (!file) { response.writeHead(404); response.end('Build not found. Run npm run build.'); return; }
  const headers = {
    'content-type': types.get(extname(file).toLowerCase()) || 'application/octet-stream',
    'cache-control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff'
  };
  response.writeHead(200, headers);
  if (request.method === 'HEAD') response.end(); else createReadStream(file).pipe(response);
});

server.listen(port, '127.0.0.1', () => process.stdout.write(`AccessRevamp preview: http://127.0.0.1:${port}\n`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
