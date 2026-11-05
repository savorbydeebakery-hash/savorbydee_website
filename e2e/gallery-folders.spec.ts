import { test, expect, devices } from "@playwright/test";

/**
 * The gallery holds only what Dee files there, in folders, and every photo's space
 * is held before it loads so nothing reshuffles (client, 2026-11-05).
 */
test.use({ viewport: devices["Pixel 7"].viewport, hasTouch: true, isMobile: true });

const tiles = "main button:has(img)";

test("every gallery photo has its space before it loads", async ({ page }) => {
  // Photos never arrive, so any height a tile has, it had without them.
  await page.route("**/storage/v1/render/image/**", (route) => route.abort());
  await page.goto("/gallery");
  await page.waitForLoadState("domcontentloaded");
  await page.locator(tiles).first().waitFor();
  const heights = await page.locator(tiles).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  expect(heights.length).toBeGreaterThan(0);
  expect(Math.min(...heights), "a tile collapses until its photo arrives").toBeGreaterThan(50);
});

test("a photo arrives with no fade, grey or zoom left on it", async ({ page }) => {
  await page.goto("/menu/daily");
  await page.waitForLoadState("networkidle");
  const styles = await page.locator(".menu-item-card img").evaluateAll((imgs) =>
    imgs.map((i) => {
      const s = getComputedStyle(i);
      return [s.filter, s.transform, s.opacity].join(" ");
    })
  );
  expect(styles.length).toBeGreaterThan(0);
  expect([...new Set(styles)]).toEqual(["none none 1"]);
});

test("a folder shows only its own photos, and All brings the rest back", async ({ page }) => {
  await page.goto("/gallery");
  await page.waitForLoadState("networkidle");
  const nav = page.getByRole("navigation", { name: "Gallery folders" });
  test.skip((await nav.count()) === 0, "Nothing is filed in a folder yet.");

  const all = await page.locator(tiles).count();
  await nav.getByRole("button").nth(1).click();
  await expect.poll(() => page.locator(tiles).count()).toBeLessThan(all);
  await expect(nav.getByRole("button").nth(1)).toHaveAttribute("aria-pressed", "true");

  await page.locator(tiles).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await nav.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.locator(tiles)).toHaveCount(all);
});
