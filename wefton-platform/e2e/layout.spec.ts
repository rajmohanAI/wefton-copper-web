import { test, expect, type Page } from '@playwright/test';

// Main storefront pages. Product data comes from Firestore, which CI does
// not configure, so these checks cover the page shell and static layout.
const PAGES = [
  { path: '/', name: 'home' },
  { path: '/men', name: 'men' },
  { path: '/women', name: 'women' },
  { path: '/new-arrivals', name: 'new arrivals' },
  { path: '/bestsellers', name: 'bestsellers' },
  { path: '/about', name: 'about' },
  { path: '/size-guide', name: 'size guide' },
];

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    if (overflow <= 1) return null;
    // Name the widest offenders so a failure points at the culprit.
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${String(el.className).split(' ').slice(0, 3).join('.')}`);
    return { overflow, offenders };
  });
}

for (const { path, name } of PAGES) {
  test.describe(`${name} page`, () => {
    test.beforeEach(async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'load' });
      expect(response?.status(), `GET ${path}`).toBeLessThan(400);
    });

    test('renders header, main content and footer', async ({ page }) => {
      await expect(page.locator('header').first()).toBeVisible();
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeAttached();

      const mainBox = await page.locator('main#main-content').boundingBox();
      expect(mainBox?.height ?? 0, 'main content height').toBeGreaterThan(200);
    });

    test('has no horizontal overflow', async ({ page }) => {
      await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
      expect(await horizontalOverflow(page)).toBeNull();
    });

    test('shows the right navigation for the viewport', async ({ page, isMobile }) => {
      const menuButton = page.getByRole('button', { name: 'Menu' });
      if (isMobile) {
        await expect(menuButton).toBeVisible();
      } else {
        await expect(menuButton).toBeHidden();
        await expect(page.locator('header nav ul').first()).toBeVisible();
      }
    });
  });
}

test('mobile menu opens and lists the collections', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  const menu = page.locator('nav.flex-col');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link', { name: /men/i }).first()).toBeVisible();
  expect(await horizontalOverflow(page)).toBeNull();
});
