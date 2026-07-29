import { test, expect } from 'playwright/test';

test('homepage proof stays compact and counts only after its scroll trigger', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const count = page.locator('[data-customer-count="87"]');
  await expect(count).toHaveAttribute('data-count-state', 'idle');
  await expect(count).toHaveText('0');
  await count.scrollIntoViewIfNeeded();
  await expect(count).toHaveAttribute('data-count-state', 'complete');
  await expect(count).toHaveText('87');
  await expect(count.locator('xpath=../..')).toContainText('Customers served');
  expect((await page.locator('.trust-strip').boundingBox())?.height).toBeLessThan(250);
  await expect(page.locator('.proof-timeline__node')).toHaveCount(3);
  await expect(page.locator('.responsive-device--laptop')).toHaveCount(1);
  await expect(page.locator('.responsive-device--phone')).toHaveCount(1);
  await expect(page.locator('.journey-artifact')).toHaveCount(3);
  await expect(page.locator('[data-example-preview]')).toHaveCount(4);
  await expect(page.locator('.services-renaissance .plan-artifacts')).toHaveCount(4);
  await expect(page.locator('.services-renaissance [data-checkout]')).toHaveCount(3);
});

test('example website preview opens from keyboard focus and Escape restores the grid', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const grid = page.locator('[data-example-grid]');
  const firstCard = page.locator('[data-example-card]').first();
  const firstPreview = firstCard.locator('[data-example-preview]');
  await firstPreview.focus();

  await expect(firstPreview).toHaveAttribute('aria-expanded', 'true');
  await expect(firstCard).toHaveClass(/is-example-active/);
  await expect(grid).toHaveClass(/is-previewing/);

  await page.keyboard.press('Escape');
  await expect(firstPreview).toHaveAttribute('aria-expanded', 'false');
  await expect(firstCard).not.toHaveClass(/is-example-active/);
  await expect(grid).not.toHaveClass(/is-previewing/);
});

test('active example website enlarges in flow and keeps neighboring sites visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const firstCard = page.locator('[data-example-card]').first();
  const preview = firstCard.locator('[data-example-preview]');
  await preview.focus();
  await expect(firstCard).toHaveClass(/is-example-active/);

  const box = await firstCard.boundingBox();
  expect(box?.width).toBeGreaterThan(400);
  expect(box?.width).toBeLessThan(800);
  await expect(firstCard).not.toHaveCSS('position', 'fixed');
  await expect(firstCard.locator('.example-website__pixels')).toHaveCSS('opacity', '0');
  const cards = page.locator('[data-example-card]');
  await expect(cards.nth(1)).toBeVisible();
  expect(Number(await cards.nth(1).evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(0.5);
  await expect(preview).toHaveText('');
});

test('touch users can open and dismiss an example website preview', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });

  const firstPreview = page.locator('[data-example-preview]').first();
  await firstPreview.tap();
  await expect(firstPreview).toHaveAttribute('aria-expanded', 'true');
  await firstPreview.tap();
  await expect(firstPreview).toHaveAttribute('aria-expanded', 'false');
  await context.close();
});

test('transformation studies and final montage use the three original homepage visuals', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const transformations = page.locator('.transformation-panel__after img');
  await expect(transformations).toHaveCount(3);
  await expect(transformations.nth(0)).toHaveAttribute('src', /spicy-peanut-butter-homepage\.webp/);
  await expect(transformations.nth(1)).toHaveAttribute('src', /plumbing-homepage\.webp/);
  await expect(transformations.nth(2)).toHaveAttribute('src', /lawn-care-homepage\.webp/);
  await expect(page.locator('.final-cta__image img[src*="-homepage.webp"]')).toHaveCount(3);
});

test('transformation studies show only source photography until hover or focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const firstPanel = page.locator('.transformation-panel').first();
  const finished = firstPanel.locator('.transformation-panel__after');
  await expect(finished).toHaveCSS('opacity', '0');
  const toggle = firstPanel.locator('[data-transformation-toggle]');
  await toggle.focus();
  await expect(finished).toHaveCSS('opacity', '1');
  await expect(firstPanel.locator('.transformation-panel__line')).toHaveCount(0);
});

test('plan artifact detail reveals locally without enlarging the plan card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const card = page.locator('.services-renaissance .plan-card--complete_revamp');
  const before = await card.boundingBox();
  const artifact = card.locator('.plan-artifact').first();
  const detail = artifact.locator('.plan-artifact__detail');
  await expect(detail).toHaveCSS('opacity', '0');
  await artifact.focus();
  await expect(detail).toHaveCSS('opacity', '1');
  const after = await card.boundingBox();
  expect(Math.abs((after?.height || 0) - (before?.height || 0))).toBeLessThan(2);
});

test('desktop customer journey presents three staggered conversation-ledger rows', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const stages = page.locator('.customer-journey article');
  await expect(stages).toHaveCount(3);
  await expect(stages.nth(0)).toContainText('Tell us what you need');
  await expect(stages.nth(1)).toContainText('Choose the right depth and direction');
  await expect(stages.nth(2)).toContainText('Review, receive, and launch');
  const positions = await stages.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
  expect(new Set(positions).size).toBe(3);
  await expect(page.locator('.customer-journey')).not.toHaveCSS('border-top-style', 'solid');
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

test('mobile finger movement drives the Atlas reveal without disabling vertical scroll', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  const hero = page.locator('[data-reveal-hero]');
  await expect(hero).toHaveCSS('touch-action', 'pan-y');
  const box = await hero.boundingBox();
  await hero.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 70, clientY: 260, isPrimary: true });
  await hero.dispatchEvent('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 240, clientY: 280, isPrimary: true });
  await expect.poll(() => hero.evaluate((element) => element.style.getPropertyValue('--reveal-x'))).toContain('240');
  await expect(hero).not.toHaveAttribute('style', /touch-action:\s*none/i);
  await hero.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: 240, clientY: 280, isPrimary: true });
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
