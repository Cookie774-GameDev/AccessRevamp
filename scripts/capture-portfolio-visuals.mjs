import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/assets/generated/', import.meta.url));
const baseURL = process.env.ACCESSREVAMP_PREVIEW_URL || 'http://127.0.0.1:4173';
const ownedPreview = process.env.ACCESSREVAMP_PREVIEW_URL ? null : spawn(
  process.execPath,
  ['scripts/preview-static.mjs', '--port', '4173'],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
const captures = [
  ['greenline-lawn-and-grounds', 'greenline-interface-01.png'],
  ['firejar-spicy-peanut-butter', 'firejar-interface-01.png'],
  ['clearflow-plumbing', 'clearflow-interface-01.png'],
];

if (ownedPreview) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });

async function settle() {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.demo-brand-hero');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.complete
      ? undefined
      : new Promise((resolve) => image.addEventListener('load', resolve, { once: true }))));
  });
}

for (const [slug, filename] of captures) {
  await page.goto(`${baseURL}/portfolio/${slug}`);
  await settle();
  await page.screenshot({
    path: join(root, filename),
    clip: { x: 0, y: 0, width: 1440, height: 1000 },
    animations: 'disabled',
  });
}

await page.goto(`${baseURL}/portfolio/greenline-lawn-and-grounds`);
await settle();
await page.evaluate(() => {
  const hero = document.querySelector('.demo-brand-hero__copy');
  hero.insertAdjacentHTML('beforeend', '<div data-capture-actions style="display:grid;grid-template-columns:repeat(3,1fr);gap:.45rem;margin-top:1rem"><span style="padding:.75rem;border:1px solid">Get quote</span><span style="padding:.75rem;border:1px solid">View services</span><span style="padding:.75rem;border:1px solid">Contact</span></div>');
});
await page.screenshot({ path: join(root, 'audit-before-01.png'), clip: { x: 0, y: 0, width: 1440, height: 1000 }, animations: 'disabled' });
await page.goto(`${baseURL}/portfolio/greenline-lawn-and-grounds`);
await settle();
await page.evaluate(() => {
  const jump = document.querySelector('.demo-jump');
  jump.textContent = 'Build one clear sample quote →';
  jump.style.background = '#f4d648';
});
await page.screenshot({ path: join(root, 'audit-after-01.png'), clip: { x: 0, y: 0, width: 1440, height: 1000 }, animations: 'disabled' });

await browser.close();
ownedPreview?.kill('SIGTERM');
console.log(`Captured ${captures.length + 2} portfolio visuals from ${baseURL}.`);
