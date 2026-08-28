import { test, expect } from "@playwright/test";

/**
 * T6.7: Admin edits menu item price → storefront reflects change.
 * NOTE: Requires seeded admin credentials via env ADMIN_EMAIL / ADMIN_PASSWORD.
 */
test("admin price edit reflects on storefront", async ({ page }) => {
  const adminEmail = process.env.ADMIN_EMAIL ?? "cloudlyconfusing@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  // Login as admin
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(adminEmail);
  await page.getByLabel(/password/i).fill(adminPassword);
  await Promise.all([
    page.waitForURL(/\/admin/),
    page.locator("form").getByRole("button", { name: /sign in/i }).click(),
  ]);

  // Open menu items admin
  await page.goto("/admin/menu-items");
  await expect(page.getByRole("heading", { name: /menu items/i })).toBeVisible();

  // Edit first item's price (99900 paise = ₹999, displays as "₹999")
  await page.locator("button", { hasText: /edit/i }).first().click();
  const priceInput = page.locator("input[name='base_price_cents'], input[type='number']").first();
  await priceInput.fill("99900");
  await page.getByRole("button", { name: /save/i }).click();

  // Storefront reflects new price
  await page.goto("/menu");
  await expect(page.getByText(/999\.99|₹999/).first()).toBeVisible({ timeout: 10_000 });
});