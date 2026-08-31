import { test, expect } from "@playwright/test";
import { istInputToInstant } from "@/lib/time/ist";

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

  // The picker's floor must respect the 24h bulk window.
  //
  // This used to locate `input[type='date']`, which does not exist on this
  // page — the checkout uses `datetime-local`. Nothing matched, the assertion
  // sat inside `if (visible)`, and the test passed without checking anything.
  await page.getByRole("button", { name: /continue/i }).click();

  const slotInput = page.locator("input[type='datetime-local']");
  await expect(slotInput).toBeVisible();
  await expect(page.getByText(/minimum 24h notice required/i)).toBeVisible();

  const min = await slotInput.getAttribute("min");
  expect(min, "the slot picker must carry a min attribute").toBeTruthy();

  const minInstant = istInputToInstant(min!);
  expect(minInstant).not.toBeNull();

  const diffHours = (minInstant!.getTime() - Date.now()) / 3_600_000;
  expect(diffHours).toBeGreaterThanOrEqual(23);
});
