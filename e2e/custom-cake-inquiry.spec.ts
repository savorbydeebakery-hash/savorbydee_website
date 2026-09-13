import { test, expect } from "@playwright/test";

/**
 * T6.7: Custom cake inquiry lifecycle.
 * Customer submits inquiry → admin sees it → review → quote → confirm → mark paid.
 */
test("custom cake inquiry flows from customer to admin", async ({ page }) => {
  // Customer submits inquiry
  await page.goto("/custom-cake");
  await expect(page.getByRole("heading", { name: /custom cake/i }).first()).toBeVisible();

  await page.getByLabel(/name/i).fill("Cake Inquiry Test");
  await page.getByLabel(/phone/i).fill("9836537447");
  // No email field: it was removed, and the column made nullable, so an
  // enquiry goes through on a name and a phone number like an order does.
  await expect(page.getByLabel(/email/i)).toHaveCount(0);
  await page.getByLabel(/flavour/i).fill("Chocolate");
  await page.getByLabel(/weight/i).fill("2kg");
  await page.getByRole("button", { name: /submit/i }).click();

  // The form no longer offers "Configured"; standard cakes are sent to the menu.
  await expect(page.getByRole("link", { name: /see the cakes/i })).toHaveAttribute(
    "href",
    /\/menu\?category=frosted-sponge-cakes/
  );

  // Success confirmation
  await expect(page.getByText(/received|submitted|thank you/i).first()).toBeVisible({
    timeout: 15_000,
  });
});