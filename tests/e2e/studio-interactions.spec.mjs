import { test, expect } from 'playwright/test';

test('rapid lens movement keeps the intended tile active and Escape closes it', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const lenses = page.locator('[data-lens]');
  await expect(lenses).toHaveCount(11);
  for (let index = 0; index < 11; index += 1) {
    await lenses.nth(index).dispatchEvent('pointerenter', { pointerType: 'mouse' });
    await page.waitForTimeout(150);
    await expect(lenses.nth(index)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-lens][aria-expanded="true"]')).toHaveCount(1);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-lens][aria-expanded="true"]')).toHaveCount(0);
});

test('touch lens accordion switches and closes on outside tap', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  const lenses = page.locator('[data-lens]');
  await lenses.nth(0).tap();
  await expect(lenses.nth(0)).toHaveAttribute('aria-expanded', 'true');
  await lenses.nth(1).tap();
  await expect(lenses.nth(0)).toHaveAttribute('aria-expanded', 'false');
  await expect(lenses.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await page.locator('h2').first().tap();
  await expect(page.locator('[data-lens][aria-expanded="true"]')).toHaveCount(0);
  await context.close();
});

for (const [name, route, chapters] of [
  ['Japan Through Time', '/portfolio/japan-through-time/index.html', 5],
  ['The Moonfold Ronin', '/portfolio/moonfold-ronin/index.html', 20],
]) {
  test(`${name} scroll film works within the 320 pixel viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(route, { waitUntil: 'networkidle' });
    await expect(page.locator('.accessrevamp-return')).toHaveAttribute('href', '/portfolio');
    await expect(page.locator('.chapter')).toHaveCount(chapters);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const firstScene = await page.locator('#stage').getAttribute('data-scene');
    await page.evaluate(() => window.scrollTo({ top: 2600, behavior: 'instant' }));
    await expect.poll(() => page.locator('#stage').getAttribute('data-scene')).not.toBe(firstScene);
  });
}
