import { test, expect } from "@playwright/test";
import { skipWhenClosed } from "./helpers/shop-open";
import { validSlotInput } from "./helpers/slot";

/**
 * T6.7: Full order placement flow.
 * Browse menu → add item to cart → checkout → fill guest info → place order → confirmation page.
 */
test("customer can place a pre-order from menu to confirmation", async ({ page }) => {
  // 1. Browse menu
  await skipWhenClosed(page);
  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: /menu/i }).first()).toBeVisible();

  // 2. Add first available item to cart (open modal, confirm)
  const addButton = page.locator("button", { hasText: /add to cart/i }).first();
  await addButton.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /add to cart/i })
    .click();

  // 3. Go to cart
  await page.goto("/cart");
  await expect(page.getByText(/your cart/i).first()).toBeVisible();

  // 4. Proceed to checkout
  await page.getByRole("button", { name: /checkout/i }).click();
  await expect(page).toHaveURL(/\/cart\/checkout/);

  // 5. Step 1 (Review) → Continue to fulfillment
  await page.getByRole("button", { name: /continue/i }).click();

  // 6. Step 2 (Fulfillment) — pickup is default, pick a slot 48h out
  await page
    .locator("input[type='datetime-local']")
    .fill(validSlotInput());
  await page.getByRole("button", { name: /continue/i }).click();

  // 7. Step 3 (Details) — fill guest info
  await page.getByLabel(/name/i).fill("E2E Test Customer");
  await page.getByLabel(/phone/i).fill("9836537447");
  await page.getByRole("button", { name: /review order/i }).click();

  // 8. Step 4 (Confirm) — place order
  await page.getByRole("button", { name: /place order/i }).click();

  // 9. Confirmation page shows order reference
  // .first(): the order number appears twice on the confirmation page — in
  // the header and as the payment panel's "Reference:" line, which became
  // visible once RetryPaymentButton was actually rendered.
  await expect(page.getByText(/SAV-/).first()).toBeVisible({ timeout: 15_000 });
});