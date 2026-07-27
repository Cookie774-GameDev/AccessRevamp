import { readFile, writeFile } from 'node:fs/promises';

const markerUrl = new URL('../src/release-marker.js', import.meta.url);
const candidate = String(process.env.VITE_RELEASE_SHA || process.env.GITHUB_SHA || 'local').trim();
const release = /^[a-f0-9]{40}$/i.test(candidate) ? candidate.toLowerCase() : 'local';
const next = `// Rewritten by scripts/stamp-release.mjs before each production build.\nexport const ACCESSREVAMP_RELEASE = ${JSON.stringify(release)};\n`;

const current = await readFile(markerUrl, 'utf8').catch(() => '');
if (current !== next) {
  await writeFile(markerUrl, next, 'utf8');
}
