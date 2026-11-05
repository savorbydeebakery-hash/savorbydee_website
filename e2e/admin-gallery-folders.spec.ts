import { test, expect } from "@playwright/test";
import { fillSignIn } from "./helpers/sign-in";

/**
 * Filing a photo in a gallery folder from Admin → Gallery. The save is caught and
 * answered here, so this writes nothing to the live database.
 */
test("a photo can be filed in a folder, and the folder then shows it", async ({ page }) => {
  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
  test.skip(!email || !password, "Needs the admin login from CI's secrets.");

  await page.goto("/login");
  await fillSignIn(page, email!, password!);
  await Promise.all([
    page.waitForURL(/\/admin/),
    page.locator("form").getByRole("button", { name: /sign in/i }).click(),
  ]);

  const saved: unknown[] = [];
  await page.route("**/rest/v1/gallery_photos*", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    saved.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });

  await page.goto("/admin/gallery");
  const view = page.locator("#gallery-folder-view");
  await expect(view).toBeVisible();
  await expect(view.locator("option")).toHaveCount(10); // All, Not in a folder, and eight folders

  // A folder nothing is in yet, so the count below can only come from this photo.
  await view.selectOption("all");
  const first = page.getByRole("combobox", { name: "Folder" }).first();
  await first.selectOption("floral");
  await expect.poll(() => saved).toContainEqual({ folder: "floral" });
  await expect(first).toHaveValue("floral");

  await view.selectOption("floral");
  await expect(page.getByRole("combobox", { name: "Folder" }).first()).toHaveValue("floral");
  await expect(page.getByText("New uploads go in Floral Cakes.")).toBeVisible();
});
