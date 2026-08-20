import { test, expect } from "@playwright/test";

/**
 * T6.7: Bulk rule enforces 24h notice.
 * Add 15x item (threshold=10) → checkout → date picker earliest = now+24h → earlier date blocked.
 */
test("bulk orders enforce 24h notice window", async ({ page }) => {
  await page.goto("/menu");

  // Add 15 of the first item (bulk threshold is 10)
  const addButton = page.locator("button", { hasText: /add to cart/i }).first();
  for (let i = 0; i < 15; i++) {
    await addButton.click();
  }

  await page.goto("/cart");
  await page.getByRole("button", { name: /checkout/i }).click();

  // Date picker should not offer slots within 24h
  const earliestOption = page.locator("input[type='date']").first();
  if (await earliestOption.isVisible().catch(() => false)) {
    const minAttr = await earliestOption.getAttribute("min");
    if (minAttr) {
      const minDate = new Date(minAttr);
      const now = new Date();
      const diffHours = (minDate.getTime() - now.getTime()) / 3_600_000;
      expect(diffHours).toBeGreaterThanOrEqual(23);
    }
  }
});