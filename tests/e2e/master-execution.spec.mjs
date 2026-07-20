import { test, expect } from 'playwright/test';

test('homepage presents four uncropped examples and three paired scrub chapters', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Example Websites' })).toBeVisible();
  await expect(page.locator('.example-website img')).toHaveCount(4);
  await expect(page.locator('[data-showcase-chapter]')).toHaveCount(3);
  await expect(page.getByText('Normal Website', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Cinematic Scroll Website', { exact: true })).toHaveCount(3);
  const fit = await page.locator('.example-website img').evaluateAll((images) => images.map((image) => getComputedStyle(image).objectFit));
  expect(fit).toEqual(['contain', 'contain', 'contain', 'contain']);

  const chapter = page.locator('[data-showcase-chapter]').first();
  await chapter.locator('video').evaluateAll((videos) => videos.forEach((video) => {
    Object.defineProperty(video, 'duration', { configurable: true, value: 8 });
    Object.defineProperty(video, 'currentTime', { configurable: true, writable: true, value: 0 });
  }));

  await page.evaluate(() => {
    const chapterElement = document.querySelector('[data-showcase-chapter]');
    document.documentElement.style.scrollBehavior = 'auto';
    const documentTop = chapterElement.getBoundingClientRect().top + scrollY;
    scrollTo(0, documentTop + ((chapterElement.offsetHeight - innerHeight) * .55));
  });
  await expect.poll(async () => Number(await chapter.getAttribute('data-progress'))).toBeGreaterThan(.4);
  const mediaState = await chapter.locator('video').evaluateAll((videos) => videos.map((video) => ({ paused: video.paused, currentTime: video.currentTime })));
  expect(mediaState.every(({ paused }) => paused)).toBe(true);
  expect(mediaState.every(({ currentTime }) => currentTime > 3)).toBe(true);
  expect(Math.abs(mediaState[0].currentTime - mediaState[1].currentTime)).toBeLessThan(.01);
});

test('mobile comparison stacks complete panels without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const pair = page.locator('.showcase-pair').first();
  const boxes = await pair.locator('.showcase-panel__media').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()));
  expect(boxes[1].top).toBeGreaterThan(boxes[0].bottom - 1);
  expect(Math.abs((boxes[0].width / boxes[0].height) - (16 / 9))).toBeLessThan(.03);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('order wizard validates, persists and prepares cinematic checkout', async ({ page }) => {
  test.setTimeout(60_000);
  await page.route('**/*.mp4', (route) => route.abort('blockedbyclient'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const form = page.locator('[data-order-wizard]');
  await form.locator('[name="fullName"]').fill('Viper Sample');
  await form.locator('[name="businessName"]').fill('Sample Studio');
  await form.locator('[name="websiteUrl"]').fill('example.com');
  await form.locator('[name="email"]').fill('viper@example.com');
  await form.locator('[name="businessNiche"]').fill('Creative services');
  await form.locator('[data-order-next]').click();
  await form.locator('input[value="cinematic_scroll"]').check();
  await form.locator('[data-order-next]').click();
  await expect(form.locator('[data-cinematic-fields]')).toBeVisible();
  await form.locator('[name="mainGoal"]').fill('Create a clear cinematic customer journey with a strong request action.');
  await form.locator('[name="requestedPages"]').fill('Home, services, about, portfolio, and contact.');
  await form.locator('[name="styleDirection"]').fill('Premium editorial direction with controlled motion and warm contrast.');
  await form.locator('[name="contentStatus"]').selectOption({ label: 'Ready to use' });
  await form.locator('[data-order-next]').click();
  await form.locator('[name="termsAccepted"]').check();
  await form.locator('[data-order-next]').click();
  await expect(form.locator('[data-order-checkout]')).toHaveAttribute('data-checkout', 'cinematic_scroll');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-order-panel="4"]')).toBeVisible();
});

test('required responsive widths keep homepage media inside the viewport', async ({ page }) => {
  await page.route('**/*.mp4', (route) => route.abort('blockedbyclient'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  for (const viewport of [
    { width: 1536, height: 864 }, { width: 1440, height: 900 }, { width: 1280, height: 800 },
    { width: 1024, height: 768 }, { width: 820, height: 1180 }, { width: 768, height: 1024 },
    { width: 430, height: 932 }, { width: 390, height: 844 }, { width: 360, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${viewport.width}px overflow`).toBeLessThanOrEqual(1);
    expect(await page.locator('.example-website img').evaluateAll((images) => images.every((image) => image.clientWidth <= innerWidth))).toBe(true);
  }
});

test('touch scrubbing captures only the active gesture and releases it', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.route('**/*.mp4', (route) => route.abort('blockedbyclient'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const stage = page.locator('[data-showcase-stage]').first();
  await stage.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 190, clientY: 260, isPrimary: true });
  await stage.dispatchEvent('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 190, clientY: 480, isPrimary: true });
  await expect(page.locator('[data-showcase-chapter]').first()).toHaveAttribute('data-dragging', 'true');
  expect(Number(await page.locator('[data-showcase-chapter]').first().getAttribute('data-progress'))).toBeGreaterThan(0);
  await stage.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: 190, clientY: 480, isPrimary: true });
  await expect(page.locator('[data-showcase-chapter]').first()).not.toHaveAttribute('data-dragging', 'true');
  expect(await page.evaluate(() => ({ body: document.body.style.overflow, stage: document.querySelector('[data-showcase-stage]').style.touchAction }))).toEqual({ body: '', stage: '' });
  await context.close();
});
