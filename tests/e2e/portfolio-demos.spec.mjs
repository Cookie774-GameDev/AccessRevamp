import { test, expect } from 'playwright/test';

const demos = ['verdant-cut', 'ember-and-jar', 'clearline-plumbing'];

for (const slug of demos) test(`${slug} is an honest interactive demo`, async ({ page }) => {
  await page.goto(`/portfolio/${slug}`);
  await expect(page.getByText('Original working demo — not a client engagement.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Design rationale' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Accessibility notes' })).toBeVisible();
  const images = page.locator('img');
  expect(await images.count()).toBeGreaterThan(0);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('Greenline sample quote completes without network fulfillment', async ({ page }) => {
  const posts = [];
  page.on('request', (request) => { if (request.method() !== 'GET') posts.push(request.url()); });
  await page.goto('/portfolio/greenline-lawn-and-grounds');
  await page.getByLabel('Lot size in square feet').fill('5000');
  await page.getByRole('button', { name: 'Calculate sample' }).click();
  await expect(page.getByText(/Sample starts at \$/)).toBeVisible();
  expect(posts).toEqual([]);
});

test('Firejar cart and Clearflow path remain functional', async ({ page }) => {
  await page.goto('/portfolio/firejar-spicy-peanut-butter');
  await page.getByRole('button', { name: /Add to demo cart/ }).first().click();
  await expect(page.locator('[data-cart-count]')).toHaveText('1');
  await page.goto('/portfolio/clearflow-plumbing');
  await page.getByRole('button', { name: /Planned repair/ }).click();
  await expect(page.getByRole('heading', { name: 'Sample planned path' })).toBeVisible();
});
