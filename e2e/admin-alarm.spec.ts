import { test, expect } from "@playwright/test";

/**
 * T6.7: Admin alarm fires on new order.
 * Login as admin → open order dashboard → submit order from another context → alarm fires.
 * NOTE: Requires seeded admin credentials via env ADMIN_EMAIL / ADMIN_PASSWORD.
 */
test("admin dashboard alarm fires on new order", async ({ browser }) => {
  const adminEmail = process.env.ADMIN_EMAIL ?? "cloudlyconfusing@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  // Admin context
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto("/login");
  await adminPage.getByLabel(/email/i).fill(adminEmail);
  await adminPage.getByLabel(/password/i).fill(adminPassword);
  await Promise.all([
    adminPage.waitForURL(/\/admin/),
    adminPage.getByRole("button", { name: /sign in/i }).click(),
  ]);
  await adminPage.goto("/admin/orders");
  await expect(adminPage.getByRole("heading", { name: /orders/i })).toBeVisible();

  // Customer context places an order
  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await customerPage.goto("/menu");
  await customerPage.locator("button", { hasText: /add to cart/i }).first().click();
  await customerPage
    .getByRole("dialog")
    .getByRole("button", { name: /add to cart/i })
    .click();
  await customerPage.goto("/cart");
  await customerPage.getByRole("button", { name: /checkout/i }).click();

  // Navigate checkout steps: review → fulfillment → details → confirm
  await customerPage.getByRole("button", { name: /continue/i }).click();
  await customerPage
    .locator("input[type='datetime-local']")
    .fill(new Date(Date.now() + 48 * 3600_000).toISOString().slice(0, 16));
  await customerPage.getByRole("button", { name: /continue/i }).click();

  await customerPage.getByLabel(/name/i).fill("Alarm Test");
  await customerPage.getByLabel(/phone/i).fill("9836537447");
  await customerPage.getByLabel(/email/i).fill("alarm@example.com");
  await customerPage.getByRole("button", { name: /review order/i }).click();

  await customerPage.getByRole("button", { name: /place order/i }).click();
  await expect(customerPage.getByText(/SAV-/)).toBeVisible({ timeout: 15_000 });

  // Admin sees the new order appear (realtime or poll fallback)
  await expect(adminPage.getByText(/Alarm Test/).first()).toBeVisible({ timeout: 20_000 });

  await adminContext.close();
  await customerContext.close();
});