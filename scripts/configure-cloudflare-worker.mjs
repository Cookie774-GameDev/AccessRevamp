import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const CLOUDFLARE_PRODUCTION_VARS = Object.freeze({
  ACCESSREVAMP_LIVE_PAYMENT_APPROVED: 'true',
  ACCESSREVAMP_SITE_URL: 'https://accessrevamp.com',
  ALLOWED_ORIGINS: 'https://accessrevamp.com,https://www.accessrevamp.com',
  STRIPE_EXPECT_LIVEMODE: 'true',
  SUPABASE_URL: 'https://vbkkimvedmklebghtkzs.supabase.co',
  VITE_SITE_URL: 'https://accessrevamp.com',
  VITE_SUPABASE_URL: 'https://vbkkimvedmklebghtkzs.supabase.co',
});

export function configureCloudflareWorker(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new TypeError('Cloudflare Worker manifest must be an object.');
  }
  return {
    ...manifest,
    name: 'accessrevamp',
    vars: {
      ...(manifest.vars || {}),
      ...CLOUDFLARE_PRODUCTION_VARS,
    },
  };
}

export async function configureCloudflareWorkerFile(
  filePath = new URL('../dist/server/wrangler.json', import.meta.url),
) {
  const source = JSON.parse(await readFile(filePath, 'utf8'));
  const configured = configureCloudflareWorker(source);
  await writeFile(filePath, `${JSON.stringify(configured)}\n`, 'utf8');
  return configured;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await configureCloudflareWorkerFile();
}
