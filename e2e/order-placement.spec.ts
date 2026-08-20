import { test, expect } from "@playwright/test";

/**
 * T6.7: Full order placement flow.
 * Browse menu → add item to cart → checkout → fill guest info → place order → confirmation page.
 */
test("customer can place a pre-order from menu to confirmation", async ({ page }) => {
  // 1. Browse menu
  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: /menu/i }).first()).toBeVisible();

  // 2. Add first available item to cart
  const addButton = page.locator("button", { hasText: /add to cart/i }).first();
  await addButton.click();

  // 3. Go to cart
  await page.goto("/cart");
  await expect(page.getByText(/your cart/i).first()).toBeVisible();

  // 4. Proceed to checkout
  await page.getByRole("button", { name: /checkout/i }).click();
  await expect(page).toHaveURL(/\/cart\/checkout/);

  // 5. Fill guest info
  await page.getByLabel(/name/i).fill("E2E Test Customer");
  await page.getByLabel(/phone/i).fill("9836537447");
  await page.getByLabel(/email/i).fill("e2e@example.com");

  // 6. Place order
  await page.getByRole("button", { name: /place order/i }).click();

  // 7. Confirmation page shows order reference
  await expect(page.getByText(/SAV-/)).toBeVisible({ timeout: 15_000 });
});