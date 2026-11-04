import { test, expect, devices, type Page } from "@playwright/test";

/**
 * The open hamburger menu sits on top of the page, and the page stays still
 * behind it. The Preorder Menu's sticky bar used to float over it, and the page
 * scrolled underneath (client's iPhone video, 2026-11-04).
 */
test.use({ viewport: devices["Pixel 7"].viewport, hasTouch: true, isMobile: true });

const whatsOnTop = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      const e = document.elementFromPoint(px, py);
      return e?.closest("#primary-nav-drawer, header") ? "menu" : e?.tagName ?? "nothing";
    },
    [x, y]
  );

for (const path of ["/menu", "/menu/daily"]) {
  test(`on ${path}, nothing floats over the open menu and the page stays still`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Part way down, so the sticky chips are stuck under the header.
    await page.locator("section[id^='cat-']").nth(1).evaluate((e: HTMLElement) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 200));
    await page.waitForTimeout(800);

    await page.getByRole("button", { name: "Open menu" }).click();
    const links = page.locator("#primary-nav-drawer nav");
    await expect(links).toBeVisible();

    const box = (await links.boundingBox())!;
    const screen = page.viewportSize()!;
    for (let y = 70; y < screen.height - 90; y += 40) {
      expect(await whatsOnTop(page, screen.width / 2, y), `at ${y}px down the screen`).toBe("menu");
    }
    expect(box.y).toBeGreaterThanOrEqual(60);

    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.move(screen.width / 2, screen.height - 150);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(150);
    }
    expect(await page.evaluate(() => window.scrollY)).toBe(before);

    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(links).toBeHidden();
    await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  });
}
