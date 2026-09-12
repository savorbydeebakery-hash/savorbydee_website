import { test, expect } from "@playwright/test";

/**
 * T6.7: an admin price edit reaches the storefront.
 *
 * This test used to set the first item's price to ₹999 and leave it there.
 * It runs against the live database on every deploy, so it had permanently
 * overwritten the real price of one item in each category — Plain Vanilla,
 * Cucumber & Mint Sandwich, Vanilla Cupcake, Tiramisu Tub and Classic NY Baked
 * were all sitting at ₹999 on the live site because of it. Customers saw those
 * prices.
 *
 * It now records what the price was, asserts on the change, and puts it back
 * in a finally block so a mid-test failure still restores it. A test that
 * writes to production has to clean up after itself.
 */
test("admin price edit reflects on storefront", async ({ page }) => {
  const adminEmail = process.env.ADMIN_EMAIL ?? "cloudlyconfusing@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(adminEmail);
  await page.getByLabel(/password/i).fill(adminPassword);
  await Promise.all([
    page.waitForURL(/\/admin/),
    page.locator("form").getByRole("button", { name: /sign in/i }).click(),
  ]);

  await page.goto("/admin/menu-items");
  await expect(page.getByRole("heading", { name: /menu items/i })).toBeVisible();

  // Addressed by its label rather than "the first number input": the editor
  // now has several, and the price is the one that matters.
  const openFirstEditor = async () => {
    await page.locator("button", { hasText: /edit/i }).first().click();
    return page.getByLabel("Base Price (₹)");
  };

  const priceInput = await openFirstEditor();
  const originalPrice = await priceInput.inputValue();
  expect(originalPrice, "could not read the original price to restore it").toBeTruthy();

  // One rupee more than it costs, not a flat ₹999.
  //
  // This spec has now corrupted a live price twice. The second time it left
  // Chocochunks 100gms — a ₹110 packet of cookies — on sale at ₹999 for
  // however long it took someone to notice. A test that writes to production
  // will occasionally fail to put things back: the process gets killed, the
  // workflow is cancelled, the save is refused. What it must not do is make
  // the damage expensive when that happens. A penny over is still visibly a
  // change to assert on, and still roughly the right price if it sticks.
  const originalPaise = Math.round(Number(originalPrice) * 100);
  expect(Number.isFinite(originalPaise), `unreadable price "${originalPrice}"`).toBe(true);
  const editedPaise = originalPaise + 100;

  try {
    await priceInput.fill(String(editedPaise / 100));
    await page.getByRole("button", { name: /save/i }).click();

    // Assert on the data attribute rather than the rendered price. The price
    // chip is replaced by "Sold Out" whenever an item is unavailable, and with
    // stock counters baselined at 0 that is currently every item — so reading
    // the visible text made this a assertion about stock, not about the edit
    // reaching the storefront.
    //
    // Checked across both menus because an item now belongs to exactly one of
    // them: /menu is preorder only, /menu/daily is today's list. This spec
    // edits whichever item happens to be first in admin, so it cannot know in
    // advance which page that item appears on.
    const priced = `[data-item-price="${editedPaise}"]`;
    await page.goto("/menu");
    let found = await page.locator(priced).first().isVisible().catch(() => false);
    if (!found) {
      await page.goto("/menu/daily");
      found = await page.locator(priced).first().isVisible().catch(() => false);
    }
    expect(found, "edited price did not appear on either menu").toBe(true);
  } finally {
    await page.goto("/admin/menu-items");
    const restoreInput = await openFirstEditor();
    await restoreInput.fill(originalPrice);
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.locator("button", { hasText: /edit/i }).first()).toBeVisible();

    // Read it back from a fresh page load. The old version asserted that an
    // Edit button was visible, which is true whether or not the price went
    // back — so a refused save looked exactly like a successful restore.
    //
    // The reload is not optional. Saving closes the modal and kicks off a
    // refetch, but the list keeps rendering the old rows until it lands, so
    // reopening the editor straight away initialises it from the stale row and
    // reads back the value that was just replaced. That raced on CI and failed
    // this spec against a price that had in fact been restored correctly.
    await page.goto("/admin/menu-items");
    await expect(page.getByRole("heading", { name: /menu items/i })).toBeVisible();
    const check = await openFirstEditor();
    await expect(
      check,
      "the price was not restored — fix it in admin before trusting this suite"
    ).toHaveValue(originalPrice);
    await page.getByRole("button", { name: /cancel/i }).click();
  }
});
