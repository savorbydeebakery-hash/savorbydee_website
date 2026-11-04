import { test, expect } from "@playwright/test";
import { fillSignIn } from "./helpers/sign-in";

/**
 * An item can't be saved while its photo is still uploading.
 *
 * Save stayed live during the upload, so an early tap stored the item with no
 * photo and threw the upload away (client, 2026-11-04: "the images I uploaded
 * are gone"). The upload is held here and then refused, and nothing is saved, so
 * this writes nothing to the live database.
 */
test("save waits for the photo to finish uploading", async ({ page }) => {
  await page.goto("/login");
  await fillSignIn(page, process.env.ADMIN_EMAIL ?? "", process.env.ADMIN_PASSWORD ?? "");
  await Promise.all([
    page.waitForURL(/\/admin/),
    page.locator("form").getByRole("button", { name: /sign in/i }).click(),
  ]);

  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/storage/v1/object/menu-items/**", async (route) => {
    await held;
    await route.abort();
  });

  await page.goto("/admin/menu-items");
  await page.locator("button", { hasText: /edit/i }).first().click();
  await expect(page.getByRole("heading", { name: "Edit Menu Item" })).toBeVisible();

  // The upload box only shows on an item with no photo. Clearing it in the form
  // changes nothing until Save, which this never reaches.
  const removePhoto = page.locator('img[alt="Preview"] + button');
  if (await removePhoto.isVisible()) await removePhoto.click();

  // A one-pixel PNG.
  const buffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  await page.locator('input[type="file"]').first().setInputFiles({ name: "cake.png", mimeType: "image/png", buffer });

  await expect(page.getByRole("button", { name: "Photo uploading..." })).toBeDisabled();

  release();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled({ timeout: 15_000 });
});
