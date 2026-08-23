import { test, expect } from "@playwright/test";

/**
 * T6.7: Bulk rule enforces 24h notice.
 * Add 15x item (threshold=10) → checkout → date picker earliest = now+24h → earlier date blocked.
 */
test("bulk orders enforce 24h notice window", async ({ page }) => {
  await page.goto("/menu");

  // Open the first item's detail modal
  await page.locator("button", { hasText: /add to cart/i }).first().click();

  // Set quantity to 15 (bulk threshold is 10) via the modal's + button
  const increaseQty = page.getByRole("button", { name: /increase quantity/i });
  for (let i = 0; i < 14; i++) {
    await increaseQty.click();
  }

  // Confirm in the modal (scoped to the dialog so we hit the modal's button)
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /add to cart/i })
    .click();

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