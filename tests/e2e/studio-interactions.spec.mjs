import { test, expect } from 'playwright/test';

test('rapid lens movement keeps the intended tile active and Escape closes it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const lenses = page.locator('[data-lens]');
  await expect(lenses).toHaveCount(11);
  for (let index = 0; index < 11; index += 1) {
    await lenses.nth(index).hover();
    await page.waitForTimeout(150);
    await expect(lenses.nth(index)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-lens][aria-expanded="true"]')).toHaveCount(1);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-lens][aria-expanded="true"]')).toHaveCount(0);
});

test('touch lens accordion switches and closes on outside tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const lenses = page.locator('[data-lens]');
  await lenses.nth(0).tap();
  await expect(lenses.nth(0)).toHaveAttribute('aria-expanded', 'true');
  await lenses.nth(1).tap();
  await expect(lenses.nth(0)).toHaveAttribute('aria-expanded', 'false');
  await expect(lenses.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await page.locator('h2').first().tap();
  await expect(page.locator('[data-lens][aria-expanded="true"]')).toHaveCount(0);
});

test('Greenline remains within the 320 pixel viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/portfolio/greenline-lawn-and-grounds', { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
