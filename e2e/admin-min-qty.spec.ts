import { test, expect } from "@playwright/test";
import { fillSignIn } from "./helpers/sign-in";

/**
 * The Min Order Qty box can be emptied and typed into.
 *
 * It used to turn an empty box back into 1 on every keystroke, so a minimum of
 * 4 could only be typed as 14 or 41: on a phone, where selecting the 1 is
 * fiddly, it couldn't be set at all (client, 2026-11-02). Types key by key, as a
 * person does. Nothing is saved, so this writes nothing to the live database.
 */
test("min order qty can be cleared and retyped", async ({ page }) => {
  await page.goto("/login");
  await fillSignIn(page, process.env.ADMIN_EMAIL ?? "", process.env.ADMIN_PASSWORD ?? "");
  await Promise.all([
    page.waitForURL(/\/admin/),
    page.locator("form").getByRole("button", { name: /sign in/i }).click(),
  ]);

  await page.goto("/admin/menu-items");
  await page.locator("button", { hasText: /edit/i }).first().click();

  const box = page.getByLabel("Min Order Qty");
  await box.click();
  await box.press("Control+A");
  await box.press("Delete");
  await expect(box, "emptying the box must leave it empty").toHaveValue("");

  await box.pressSequentially("4");
  await expect(box).toHaveValue("4");
});
