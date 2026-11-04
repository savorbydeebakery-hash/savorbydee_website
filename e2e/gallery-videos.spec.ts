import { test, expect, devices } from "@playwright/test";

/**
 * A YouTube Short is upright, in the grid and in the player, and fits the screen.
 * It used to sit in a widescreen box with bars either side (client, 2026-11-04).
 * Reads the gallery as it stands, so it passes over this if there is no Short.
 */
test.use({ viewport: devices["Pixel 7"].viewport, hasTouch: true, isMobile: true });

test("a Short shows upright and fits the phone's screen", async ({ page }) => {
  await page.goto("/gallery");
  await page.waitForLoadState("networkidle");
  const short = page.locator('button[aria-label^="Play video"]').filter({ has: page.locator('img[src*="oardefault"]') }).first();
  test.skip((await short.count()) === 0, "No Short in the gallery right now.");

  const tile = (await short.locator("span").first().boundingBox())!;
  expect(tile.height).toBeGreaterThan(tile.width * 1.5);

  await short.click();
  const player = page.getByRole("dialog").locator("iframe");
  await expect(player).toBeVisible();
  const box = (await player.boundingBox())!;
  const screen = page.viewportSize()!;
  expect(box.height).toBeGreaterThan(box.width * 1.5);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(screen.width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(screen.height);
});
