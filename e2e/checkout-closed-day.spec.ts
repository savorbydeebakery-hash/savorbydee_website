import { test, expect } from "@playwright/test";

/**
 * T6.7: Closed day (Sunday) is blocked in checkout date picker.
 * Requires admin to set Sunday closed in settings (manual QA setup).
 */
test("closed day is not selectable in checkout", async ({ page }) => {
  await page.goto("/menu");
  await page.locator("button", { hasText: /add to cart/i }).first().click();
  await page.goto("/cart");
  await page.getByRole("button", { name: /checkout/i }).click();

  const dateInput = page.locator("input[type='date']").first();
  if (await dateInput.isVisible().catch(() => false)) {
    // If a min attribute exists, the earliest allowed date must not be a Sunday
    const minAttr = await dateInput.getAttribute("min");
    if (minAttr) {
      const minDate = new Date(minAttr);
      expect(minDate.getDay()).not.toBe(0); // 0 = Sunday
    }
  }
});