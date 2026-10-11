import { test, expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Storefront layout checks, run at 375 / 768 / 1024 / 1440 px
 * (see playwright.config.ts). CI builds with the public Firebase config from
 * apphosting.yaml, so pages render real Firestore data.
 */

const PAGES: { path: string; name: string; shell?: boolean }[] = [
  { path: '/', name: 'home' },
  { path: '/men', name: 'men' },
  { path: '/women', name: 'women' },
  { path: '/new-arrivals', name: 'new arrivals' },
  { path: '/bestsellers', name: 'bestsellers' },
  { path: '/about', name: 'about' },
  { path: '/vision', name: 'vision' },
  { path: '/size-guide', name: 'size guide' },
  { path: '/shipping', name: 'shipping' },
  // Signed-out visitors get the sign-in dialog, which hides the page shell
  // behind a modal, so only the overflow check applies.
  { path: '/checkout', name: 'checkout', shell: false },
];

// The header switches to the menu button below Tailwind's `lg` breakpoint.
const DESKTOP_NAV_MIN_WIDTH = 1024;

const isNarrow = (page: Page) => (page.viewportSize()?.width ?? 0) < DESKTOP_NAV_MIN_WIDTH;

type Overflow = { viewport: number; scrollWidth: number; offenders: string[] };

/**
 * Measures how far the page sticks out past the right edge.
 *
 * `body { overflow-x: hidden }` clips overflow, so scrollWidth alone would
 * never exceed the viewport. Clipping is switched off while measuring, and
 * the outermost offending elements are named so a failure points at the culprit.
 */
async function measureOverflow(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const saved = [html.style.overflowX, body.style.overflowX];
    html.style.overflowX = 'visible';
    body.style.overflowX = 'visible';

    const viewport = html.clientWidth;
    const scrollWidth = html.scrollWidth;
    const offenders: string[] = [];
    if (scrollWidth > viewport + 1) {
      for (const el of Array.from(body.querySelectorAll<HTMLElement>('*'))) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.right <= viewport + 1) continue;
        const parent = el.parentElement;
        if (parent && parent !== body && parent.getBoundingClientRect().right > viewport + 1) continue;
        const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 4).join('.') : '';
        offenders.push(
          `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? '.' + cls : ''} ` +
            `(right edge ${Math.round(rect.right)}px, width ${Math.round(rect.width)}px)`,
        );
        if (offenders.length >= 10) break;
      }
    }

    html.style.overflowX = saved[0];
    body.style.overflowX = saved[1];
    return { viewport, scrollWidth, offenders };
  });
}

function overflowMessage(path: string, m: Overflow, when: string) {
  return (
    `${path} is ${m.scrollWidth - m.viewport}px wider than the ${m.viewport}px viewport ${when}. ` +
    `Offending elements:\n  ${m.offenders.join('\n  ')}`
  );
}

async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

/**
 * Checks for overflow on load and again after scrolling through the page:
 * content waiting for an in-view animation can stick out until it is reached.
 * Attaches a full-page screenshot to the report for visual review.
 */
async function expectNoOverflow(page: Page, path: string, testInfo: TestInfo) {
  // Let client components hydrate and Firestore-backed sections render.
  await page.waitForTimeout(2_000);
  const onLoad = await measureOverflow(page);
  await scrollThrough(page);
  const afterScroll = await measureOverflow(page);

  await testInfo.attach(`${testInfo.project.name}${path.replace(/\W+/g, '_')}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  expect.soft(onLoad.scrollWidth, overflowMessage(path, onLoad, 'on load')).toBeLessThanOrEqual(onLoad.viewport + 1);
  expect(afterScroll.scrollWidth, overflowMessage(path, afterScroll, 'after scrolling')).toBeLessThanOrEqual(
    afterScroll.viewport + 1,
  );
}

for (const { path, name, shell = true } of PAGES) {
  test.describe(`${name} page`, () => {
    test.beforeEach(async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'load' });
      expect(response?.status(), `GET ${path}`).toBeLessThan(400);
    });

    test('renders header, main content and footer', async ({ page }) => {
      test.skip(!shell, 'page shell is behind the sign-in dialog');
      await expect(page.locator('header').first()).toBeVisible();
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeAttached();

      const mainBox = await page.locator('main#main-content').boundingBox();
      expect(mainBox?.height ?? 0, 'main content height').toBeGreaterThan(200);
    });

    test('has no horizontal overflow', async ({ page }, testInfo) => {
      await expectNoOverflow(page, path, testInfo);
    });

    test('shows the right navigation for the viewport', async ({ page }) => {
      test.skip(!shell, 'page shell is behind the sign-in dialog');
      const menuButton = page.getByRole('button', { name: 'Menu' });
      if (isNarrow(page)) {
        await expect(menuButton).toBeVisible();
      } else {
        await expect(menuButton).toBeHidden();
        await expect(page.locator('header nav ul').first()).toBeVisible();
      }
    });
  });
}

test('product page has no horizontal overflow', async ({ page }, testInfo) => {
  await page.goto('/men', { waitUntil: 'load' });
  const href = await page
    .locator('a[href^="/products/"]')
    .first()
    .getAttribute('href', { timeout: 15_000 })
    .catch(() => null);
  test.skip(!href, 'No products listed on /men (Firestore empty or unreachable)');
  const response = await page.goto(href!, { waitUntil: 'load' });
  expect(response?.status(), `GET ${href}`).toBeLessThan(400);
  await expectNoOverflow(page, href!, testInfo);
});

test('mobile menu opens and lists the collections', async ({ page }) => {
  await page.goto('/');
  test.skip(!isNarrow(page), 'menu button only shows below 1024px');
  await page.getByRole('button', { name: 'Menu' }).click();
  const menu = page.locator('nav.flex-col');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link', { name: /men/i }).first()).toBeVisible();
  const m = await measureOverflow(page);
  expect(m.scrollWidth, overflowMessage('/ (menu open)', m, 'with the menu open')).toBeLessThanOrEqual(m.viewport + 1);
});
