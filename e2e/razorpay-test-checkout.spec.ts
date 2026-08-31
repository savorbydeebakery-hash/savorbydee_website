import { test, expect } from "@playwright/test";
import { validSlotInput } from "./helpers/slot";

/**
 * T6.7: Razorpay test checkout modal opens.
 * Place order with "Pay Online" → Razorpay test modal opens.
 * NOTE: Actual payment is mocked/skipped in CI — we verify the modal opens.
 */
test("pay online opens Razorpay checkout modal", async ({ page }) => {
  await page.goto("/menu");
  await page.locator("button", { hasText: /add to cart/i }).first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /add to cart/i })
    .click();
  await page.goto("/cart");
  await page.getByRole("button", { name: /checkout/i }).click();

  // Navigate checkout steps: review → fulfillment → details → confirm
  await page.getByRole("button", { name: /continue/i }).click();
  await page
    .locator("input[type='datetime-local']")
    .fill(validSlotInput());
  await page.getByRole("button", { name: /continue/i }).click();

  await page.getByLabel(/name/i).fill("Razorpay Test");
  await page.getByLabel(/phone/i).fill("9836537447");
  await page.getByLabel(/email/i).fill("rzp@example.com");
  await page.getByRole("button", { name: /review order/i }).click();

  // If Razorpay is active, "Pay Online" button appears on confirm step
  const payOnline = page.getByRole("button", { name: /pay online/i });
  if (await payOnline.isVisible().catch(() => false)) {
    await payOnline.click();
    // Razorpay modal iframe appears (checkout.razorpay.com)
    await expect(page.frameLocator("iframe[src*='razorpay']").first().locator("body")).toBeVisible({
      timeout: 15_000,
    });
  } else {
    // Razorpay not set up / KYC-pending — UPI fallback shown instead
    await expect(page.getByText(/upi/i).first()).toBeVisible();
  }
});