import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const baseURL = 'http://127.0.0.1:4173';
const output = 'C:/Users/viper/AppData/Local/Temp';
const preview = spawn(process.execPath, ['scripts/preview-static.mjs', '--port', '4173'], { stdio: 'ignore' });

for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    if ((await fetch(baseURL)).ok) break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

const browser = await chromium.launch();
const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await desktop.goto(baseURL, { waitUntil: 'networkidle' });
await desktop.evaluate(() => document.fonts.ready);
await desktop.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((element) => element.classList.add('is-visible')));
await desktop.screenshot({ path: `${output}/accessrevamp-redesign-desktop-full.png`, fullPage: true, animations: 'disabled' });
await desktop.screenshot({ path: `${output}/accessrevamp-redesign-desktop-hero.png`, animations: 'disabled' });
await desktop.locator('.spectrum-section').screenshot({ path: `${output}/accessrevamp-redesign-lenses.png`, animations: 'disabled' });
await desktop.locator('[data-lens]').first().hover();
await desktop.locator('.spectrum-section').screenshot({ path: `${output}/accessrevamp-redesign-lens-expanded.png`, animations: 'disabled' });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mobile.goto(baseURL, { waitUntil: 'networkidle' });
await mobile.evaluate(() => document.fonts.ready);
await mobile.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((element) => element.classList.add('is-visible')));
await mobile.screenshot({ path: `${output}/accessrevamp-redesign-mobile-hero.png`, animations: 'disabled' });
await mobile.locator('[data-lens]').first().click();
await mobile.waitForTimeout(550);
await mobile.screenshot({ path: `${output}/accessrevamp-redesign-mobile-lens-expanded.png`, animations: 'disabled' });
await mobile.screenshot({ path: `${output}/accessrevamp-redesign-mobile-full.png`, fullPage: true, animations: 'disabled' });

await browser.close();
preview.kill('SIGTERM');
console.log('Captured desktop, mobile, hero, and lens review images.');
