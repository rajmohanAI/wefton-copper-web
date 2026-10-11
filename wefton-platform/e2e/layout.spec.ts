import { test, expect, type Page } from '@playwright/test';

/**
 * Fails when a page is wider than the viewport.
 *
 * `body { overflow-x: hidden }` clips horizontal overflow, so a plain
 * scrollWidth check would always pass. The check turns that clipping off,
 * measures, and names the elements that stick out past the right edge.
 * A full-page screenshot is attached to every run for visual review.
 */

const PAGES = ['/', '/men', '/women', '/new-arrivals', '/about', '/vision', '/checkout', '/shipping'];

type Offender = { selector: string; right: number; width: number };

async function measureOverflow(page: Page) {
  return page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const saved = [html.style.overflowX, body.style.overflowX];
    html.style.overflowX = 'visible';
    body.style.overflowX = 'visible';

    const viewport = window.innerWidth;
    const scrollWidth = html.scrollWidth;
    const offenders: Offender[] = [];

    if (scrollWidth > viewport) {
      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.right <= viewport + 1) continue;
        // Report the outermost offender only; its children add no information.
        const parent = el.parentElement;
        if (parent && parent.getBoundingClientRect().right > viewport + 1 && parent !== body) continue;
        const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 4).join('.') : '';
        offenders.push({
          selector: `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
        if (offenders.length >= 10) break;
      }
    }

    html.style.overflowX = saved[0];
    body.style.overflowX = saved[1];
    return { viewport, scrollWidth, offenders };
  });
}

async function scrollThrough(page: Page) {
  // Scroll through once so in-view content reaches its final state.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

function describe(path: string, m: Awaited<ReturnType<typeof measureOverflow>>, when: string) {
  return (
    `${path} is ${m.scrollWidth - m.viewport}px wider than the ${m.viewport}px viewport ${when}. Offending elements:\n` +
    m.offenders.map((o) => `  ${o.selector} (right edge ${o.right}px, width ${o.width}px)`).join('\n')
  );
}

async function check(page: Page, path: string, testInfo: import('@playwright/test').TestInfo) {
  await page.goto(path, { waitUntil: 'load' });
  // Let client components hydrate and Firestore-backed sections render.
  await page.waitForTimeout(2_000);

  // Measure before scrolling too: content waiting for an in-view animation
  // (e.g. sliding in from the side) can overflow until it is scrolled to.
  const onLoad = await measureOverflow(page);
  await scrollThrough(page);
  const afterScroll = await measureOverflow(page);

  await testInfo.attach(`${testInfo.project.name}${path.replace(/\W+/g, '_')}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  expect.soft(onLoad.scrollWidth, describe(path, onLoad, 'on load')).toBeLessThanOrEqual(onLoad.viewport);
  expect(afterScroll.scrollWidth, describe(path, afterScroll, 'after scrolling')).toBeLessThanOrEqual(
    afterScroll.viewport,
  );
}

for (const path of PAGES) {
  test(`no horizontal overflow on ${path}`, async ({ page }, testInfo) => {
    await check(page, path, testInfo);
  });
}

test('no horizontal overflow on a product page', async ({ page }, testInfo) => {
  await page.goto('/men', { waitUntil: 'load' });
  const link = page.locator('a[href^="/products/"]').first();
  const href = await link.getAttribute('href', { timeout: 15_000 }).catch(() => null);
  test.skip(!href, 'No products listed on /men (Firestore empty or unreachable)');
  await check(page, href!, testInfo);
});
