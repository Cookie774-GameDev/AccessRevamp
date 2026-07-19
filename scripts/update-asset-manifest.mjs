import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'public', 'assets', 'generated');
const file = join(root, 'manifest.json');
const manifest = JSON.parse(await readFile(file, 'utf8'));
const licensed = {
  'greenline-hero-01': ['Pexels', 'Magda Ehlers', 'https://www.pexels.com/photo/lawn-mower-on-grass-4162011/'],
  'greenline-detail-01': ['Pexels', 'Magda Ehlers', 'https://www.pexels.com/photo/lawn-mower-on-grass-4162011/'],
  'firejar-hero-01': ['Pexels', 'Kaboompics', 'https://www.pexels.com/photo/close-up-photo-of-peanut-butter-toast-6659679/'],
  'firejar-gentle-01': ['Pexels', 'Kaboompics', 'https://www.pexels.com/photo/close-up-photo-of-peanut-butter-toast-6659679/'],
  'firejar-bright-01': ['Pexels', 'Kaboompics', 'https://www.pexels.com/photo/close-up-photo-of-peanut-butter-toast-6659679/'],
  'firejar-hot-01': ['Pexels', 'Kaboompics', 'https://www.pexels.com/photo/close-up-photo-of-peanut-butter-toast-6659679/'],
  'clearflow-hero-01': ['Unsplash', 'Bhagya Laxmi', 'https://unsplash.com/photos/a-plumber-repairs-plumbing-in-a-bathroom-jaP5ClBdIyU'],
  'clearflow-detail-01': ['Unsplash', 'Bhagya Laxmi', 'https://unsplash.com/photos/a-plumber-repairs-plumbing-in-a-bathroom-jaP5ClBdIyU'],
};

for (const asset of manifest.assets) {
  if (licensed[asset.id]) {
    const [library, creator, sourcePage] = licensed[asset.id];
    asset.sourceType = 'licensed-stock';
    asset.tool = `${library} source photograph, locally optimized with FFmpeg`;
    asset.creator = creator;
    asset.sourcePage = sourcePage;
    asset.rights = `${library} free-use license; see docs/ASSET_SOURCES.md`;
    asset.manualEdits = 'Intentionally cropped and encoded as local WebP and AVIF derivatives.';
  }
  for (const format of ['avif', 'webp']) {
    const variant = asset.variants[format];
    const bytes = await readFile(join(root, variant.file));
    variant.bytes = (await stat(join(root, variant.file))).size;
    variant.sha256 = createHash('sha256').update(bytes).digest('hex');
  }
}

manifest.generatedAt = new Date().toISOString();
await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Updated ${manifest.assets.length} asset groups.`);
