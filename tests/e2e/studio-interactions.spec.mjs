import { test, expect } from 'playwright/test';

test('desktop customer journey presents all three connected project stages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const stages = page.locator('.customer-journey article');
  await expect(stages).toHaveCount(3);
  await expect(stages.nth(0)).toContainText('Tell us what you need');
  await expect(stages.nth(1)).toContainText('Choose your plan and designs');
  await expect(stages.nth(2)).toContainText('Receive, review, and launch');
  const positions = await stages.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
  expect(new Set(positions).size).toBe(1);
});

test('mobile customer journey stacks without horizontal overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  const stages = page.locator('.customer-journey article');
  await expect(stages).toHaveCount(3);
  const positions = await stages.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
  expect(new Set(positions).size).toBe(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
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
