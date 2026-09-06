import { test, expect } from "@playwright/test";

/**
 * The menu item's option lists can be typed into.
 *
 * This guards a control that was inert. Weight tiers, add-ons, variants,
 * decoration and sizes were edited as JSON in a controlled textarea whose
 * onChange did `try { JSON.parse(...) } catch {}`. React restores a controlled
 * input's DOM value after every change event, so any keystroke that left the
 * text un-parseable was reverted — and adding an object to `[]` passes through
 * `[{` on the way. Typing a complete, valid array one character at a time left
 * the box on `[]`. Every weight tier and decoration on the live site had to be
 * written in SQL because of it.
 *
 * A unit test cannot catch this: `JSON.parse` was working perfectly. It only
 * shows up against a real React render, which is what this does.
 *
 * Deliberately makes NO write. It cancels out of the modal instead of saving,
 * because it runs against the live database on every deploy and a half-failed
 * run must not leave a stray decoration option on a cake customers can see.
 * The save path is covered by admin-menu-edit.spec.ts, which restores what it
 * changes.
 */
test("menu item option rows accept typing", async ({ page }) => {
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
  await page.locator("button", { hasText: /edit/i }).first().click();

  // Prices are in rupees now. The box was labelled "(paise)" and held 90000
  // for a ₹900 cake, so typing the number you meant priced it at ₹9.
  const priceBox = page.getByLabel("Base Price (₹)");
  await expect(priceBox).toBeVisible();
  const priceText = await priceBox.inputValue();
  expect(
    Number(priceText),
    `base price reads as ${priceText}; rupees expected, so a cake should be in the hundreds, not the tens of thousands`
  ).toBeLessThan(20000);

  // Add a decoration row and type into both boxes. This is the interaction the
  // old control refused outright.
  const before = await page.getByLabel(/^Decoration name, row/).count();
  await page.getByRole("button", { name: "Add a row to Decoration" }).click();

  const nameBox = page.getByLabel(`Decoration name, row ${before + 1}`);
  const amountBox = page.getByLabel(`Decoration Extra (₹), row ${before + 1}`);
  await nameBox.fill("Gold leaf");
  await amountBox.fill("250");

  // The assertion that would have failed before: the typed text survives.
  await expect(nameBox).toHaveValue("Gold leaf");
  await expect(amountBox).toHaveValue("250");

  // A row can be removed again, so a mis-click is recoverable.
  await page.getByRole("button", { name: "Remove Gold leaf" }).click();
  await expect(page.getByLabel(/^Decoration name, row/)).toHaveCount(before);

  // The resolved notice is spelled out rather than leaving a blank box unexplained.
  await expect(page.getByText(/Notice for this item:/)).toBeVisible();
  await expect(page.getByText(/Counts as bulk at:/)).toBeVisible();

  // Leave without writing anything.
  await page.getByRole("button", { name: /cancel/i }).click();
});
