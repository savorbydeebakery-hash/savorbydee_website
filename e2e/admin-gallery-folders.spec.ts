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
  await expect(view.locator("option", { hasText: "Floral Cakes" })).toHaveCount(1);

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

/**
 * Dee's own folders. Every save is caught and answered here, so this writes nothing.
 */
test("a folder can be added, renamed and deleted", async ({ page }) => {
  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
  test.skip(!email || !password, "Needs the admin login from CI's secrets.");

  await page.goto("/login");
  await fillSignIn(page, email!, password!);
  await Promise.all([
    page.waitForURL(/\/admin/),
    page.locator("form").getByRole("button", { name: /sign in/i }).click(),
  ]);

  const writes: string[] = [];
  await page.route("**/rest/v1/gallery_folders*", async (route) => {
    const method = route.request().method();
    if (method === "GET") return route.continue();
    writes.push(method);
    if (method === "POST") {
      const body = route.request().postDataJSON();
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(Array.isArray(body) ? body[0] : body) });
    }
    return route.fulfill({ status: 204 });
  });
  page.on("dialog", (d) => d.accept());

  await page.goto("/admin/gallery");
  await page.getByRole("button", { name: "Manage folders" }).click();
  const list = page.getByRole("list", { name: "Folders" });
  await expect(list.getByText("Floral Cakes")).toBeVisible();

  // A name that's taken is refused before anything is sent.
  await page.getByLabel("New folder").fill("floral cakes");
  await page.getByRole("button", { name: "Add folder" }).click();
  // Filtered: Next's route announcer is an alert too.
  await expect(page.getByRole("alert").filter({ hasText: "already" })).toBeVisible();

  await page.getByLabel("New folder").fill("Test Folder E2E");
  await page.getByRole("button", { name: "Add folder" }).click();
  await expect(list.getByText("Test Folder E2E")).toBeVisible();
  await expect(page.locator("#gallery-folder-view option", { hasText: "Test Folder E2E" })).toHaveCount(1);

  await list.locator("li", { hasText: "Test Folder E2E" }).getByRole("button", { name: "Rename" }).click();
  await page.getByLabel("New name for Test Folder E2E").fill("Renamed Folder E2E");
  await list.getByRole("button", { name: "Save" }).click();
  await expect(list.getByText("Renamed Folder E2E")).toBeVisible();

  await page.getByRole("button", { name: "Delete Renamed Folder E2E" }).click();
  await expect(list.getByText("Renamed Folder E2E")).toHaveCount(0);
  expect(writes).toEqual(["POST", "PATCH", "DELETE"]);
});
