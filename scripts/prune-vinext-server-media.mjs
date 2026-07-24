import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const serverMedia = join(process.cwd(), 'dist', 'server', 'media');

await rm(serverMedia, { recursive: true, force: true });
console.log('Kept showcase videos in Cloudflare static-asset delivery instead of the Worker script bundle.');
