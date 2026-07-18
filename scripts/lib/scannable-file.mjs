import { basename, extname } from 'node:path';

const textExtensions = new Set([
  '.cjs', '.css', '.csv', '.html', '.js', '.json', '.jsx', '.md', '.mjs',
  '.scss', '.sql', '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);

export function isPolicyScannable(path) {
  const name = basename(path).toLowerCase();
  return name.startsWith('.env') || textExtensions.has(extname(name));
}
