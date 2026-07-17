import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const sourcePath = '.bootstrap-v2/backend.mjs';
const outputPath = '.bootstrap-v3/backend-repaired.mjs';
const source = await readFile(sourcePath, 'utf8');
const tick = String.fromCharCode(96);
const opener = 'String.raw' + tick;
const closer = tick + ');';
let cursor = 0;
let repaired = '';
let templates = 0;

while (cursor < source.length) {
  const start = source.indexOf(opener, cursor);
  if (start === -1) {
    repaired += source.slice(cursor);
    break;
  }
  const contentStart = start + opener.length;
  const end = source.indexOf(closer, contentStart);
  if (end === -1) throw new Error('Could not locate the end of a generated file template.');
  repaired += source.slice(cursor, contentStart);
  repaired += source.slice(contentStart, end).split(tick).join('\\' + tick);
  repaired += closer;
  cursor = end + closer.length;
  templates += 1;
}

if (templates < 20) throw new Error('Repair did not find the expected generated file templates.');
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, repaired, 'utf8');
await import(pathToFileURL(resolve(outputPath)).href + '?run=' + Date.now());
console.log('Repaired and executed ' + templates + ' backend templates.');
