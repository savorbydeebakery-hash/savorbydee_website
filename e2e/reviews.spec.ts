import { test, expect, devices, type Page } from "@playwright/test";

/**
 * The homepage reviews stay one size and only move when someone moves them. They
 * used to advance by themselves and resize to each review, which shifted the
 * whole page under whoever was reading it (client, 2026-11-04).
 */
const region = (page: Page) => page.locator('[aria-label="Customer reviews"]');
const open = async (page: Page) => {
  await page.goto("/");
  await region(page).waitFor();
  await region(page).evaluate((e: HTMLElement) => e.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1500);
};

for (const [label, use] of [
  ["computer", { viewport: { width: 1280, height: 860 } }],
  // isMobile matters: only a real phone viewport shows a page that has grown too
  // wide, by zooming out to fit it.
  ["phone", { viewport: devices["Pixel 7"].viewport, hasTouch: true, isMobile: true }],
] as const) {
  test.describe(`reviews on a ${label}`, () => {
    test.use(use);

    // Watched on every frame of a real scroll: the gallery strip only stretched
    // past the screen edge while the page was moving, then settled back.
    test("the page is never wider than the screen, even mid-scroll", async ({ page }) => {
      await page.goto("/");
      await region(page).waitFor();
      await page.evaluate(() => {
        const seen = window as unknown as { widest: number };
        seen.widest = 0;
        const watch = () => {
          seen.widest = Math.max(seen.widest, document.documentElement.scrollWidth);
          requestAnimationFrame(watch);
        };
        watch();
      });
      await page.mouse.move(100, 300);
      for (let i = 0; i < 20; i++) {
        await page.mouse.wheel(0, 700);
        await page.waitForTimeout(90);
      }
      const [widest, screen] = await page.evaluate(() => [
        (window as unknown as { widest: number }).widest,
        document.documentElement.clientWidth,
      ]);
      expect(widest).toBeLessThanOrEqual(screen);
    });

    test("doesn't move on its own", async ({ page }) => {
      await open(page);
      const before = await region(page).evaluate((e: HTMLElement) => [e.scrollLeft, e.offsetHeight, document.documentElement.scrollHeight]);
      await page.waitForTimeout(7000); // it used to change every 5 seconds
      const after = await region(page).evaluate((e: HTMLElement) => [e.scrollLeft, e.offsetHeight, document.documentElement.scrollHeight]);
      expect(after).toEqual(before);
      await expect(page.getByRole("button", { name: /Pause the review|Play the review/ })).toHaveCount(0);
    });

    test("every review is the same size and the page doesn't shift", async ({ page }) => {
      await open(page);
      const box = region(page);
      const startHeight = await box.evaluate((e: HTMLElement) => e.offsetHeight);
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const scrollY = await page.evaluate(() => window.scrollY);

      const dots = page.getByRole("button", { name: /Show review \d+ of \d+/ });
      const n = await dots.count();
      expect(n).toBeGreaterThan(1);
      for (let i = 0; i < n; i++) {
        await dots.nth(i).click();
        await page.waitForTimeout(450);
        expect(await box.evaluate((e: HTMLElement) => e.offsetHeight), `review ${i + 1}`).toBe(startHeight);
        expect(await page.evaluate(() => document.documentElement.scrollHeight), `page height at review ${i + 1}`).toBe(pageHeight);
        await expect(dots.nth(i)).toHaveAttribute("aria-current", "true");
      }
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollY)).toBeLessThan(2);
    });

    test("the arrows move one review at a time, and a long review scrolls inside its card", async ({ page }) => {
      await open(page);
      const dots = page.getByRole("button", { name: /Show review \d+ of \d+/ });
      await page.getByRole("button", { name: "Next review" }).click();
      await page.waitForTimeout(700);
      await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");
      await page.getByRole("button", { name: "Previous review" }).click();
      await page.waitForTimeout(700);
      await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");

      const longest = await region(page).evaluate((e: HTMLElement) => {
        const boxes = [...e.querySelectorAll("[data-lenis-prevent]")] as HTMLElement[];
        const el = boxes[0];
        if (!el) return null;
        el.scrollTop = 40;
        return { moved: el.scrollTop, fits: el.closest("figure")!.offsetHeight <= e.offsetHeight };
      });
      if (longest) {
        expect(longest.moved).toBeGreaterThan(0);
        expect(longest.fits).toBe(true);
      }
    });
  });
}

/**
 * Where a long review sits under the finger or the pointer, it must not become a
 * dead patch of the page: read it to the end and the page carries on.
 */
test.describe("a long review doesn't trap anyone", () => {
  test.describe("on a phone", () => {
    test.use({ viewport: devices["Pixel 7"].viewport, hasTouch: true, isMobile: true });

    test("a swipe from it moves the reviews sideways, and the page once it is read", async ({ page }) => {
      await open(page);
      const cdp = await page.context().newCDPSession(page);
      const swipe = async (x: number, y: number, dx: number, dy: number) => {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        for (let i = 1; i <= 14; i++) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: x + (dx * i) / 14, y: y + (dy * i) / 14 }],
          });
          await page.waitForTimeout(16);
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(800);
      };
      const box = (await region(page).boundingBox())!;
      const dots = page.getByRole("button", { name: /Show review \d+ of \d+/ });

      await swipe(box.x + box.width - 40, box.y + box.height / 2, -260, 0);
      await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");
      await dots.nth(0).click();
      await page.waitForTimeout(800);

      const start = await page.evaluate(() => window.scrollY);
      for (let i = 0; i < 4; i++) await swipe(box.x + box.width / 2, box.y + box.height / 2 + 90, 0, -180);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(start + 100);
    });
  });

  test.describe("on a computer", () => {
    test.use({ viewport: { width: 1280, height: 860 } });

    test("the wheel over it carries on to the page", async ({ page }) => {
      await open(page);
      const box = (await region(page).boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const start = await page.evaluate(() => window.scrollY);
      for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, 240);
        await page.waitForTimeout(700);
      }
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(start + 100);
    });
  });
});
