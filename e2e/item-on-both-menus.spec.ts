import { test, expect } from "@playwright/test";
import { fillEarliestSlot } from "./helpers/slot";

/**
 * An item on both menus can be preordered, through the real checkout.
 *
 * A cart line says which menu it came from, and the order API needs to be told:
 * for an item on both menus it can't work that out from the item (migration
 * 00056). The checkout once left dailyMenu out of the request, so every cookie
 * preorder was taken for a Today's Menu order and refused at the last step, as
 * closed or for today's stock (client's cookies, 2026-11-02). Tests that posted
 * to the API wrote dailyMenu themselves and passed, and order-placement.spec.ts
 * buys the first item on the menu, which is on one menu only. Hence the whole
 * journey, on an item that really is on both.
 *
 * Doesn't need the shop open: preorders can be placed while closed. It skips,
 * loudly, when no item is on both menus, because then nothing can be exercised.
 * The order is named as a fixture: staff phones stay quiet, and
 * scripts/purge-e2e-rows.mjs removes it after the run.
 */
test("an item on both menus can be preordered through the checkout", async ({ page }) => {
  await page.goto("/menu/daily");
  await expect(page.locator("main button[data-item-name]").first()).toBeVisible();
  const onToday = await page
    .locator("main button[data-item-name]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-item-name")!.toLowerCase()));

  await page.goto("/menu");
  await expect(page.locator("main .menu-item-card").first()).toBeVisible();
  const onPreorder = await page
    .locator('main .menu-item-card[data-orderable="true"]')
    .filter({ has: page.getByRole("button", { name: /add to cart/i }) })
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-item-name")!));

  const name = onPreorder.find((n) => onToday.includes(n));
  test.skip(
    !name,
    `No orderable item is on both menus (${onToday.length} on Today's Menu, ${onPreorder.length} ` +
      "orderable on the Preorder Menu). Tick both menu boxes on an item to turn this back on."
  );

  // Start from an empty basket regardless of what a previous spec left.
  await page.evaluate(() => window.localStorage.removeItem("savor-cart"));
  await page.reload();

  const card = page.locator(`main .menu-item-card[data-item-name="${name}"]`).first();
  await card.getByRole("button", { name: /add to cart/i }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /add to cart/i })
    .last()
    .click();

  await page.goto("/cart/checkout");
  await page.getByRole("button", { name: /continue/i }).click();
  await fillEarliestSlot(page);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel(/name/i).fill("E2E Test Customer");
  await page.getByLabel(/phone/i).fill("9836537447");
  await page.getByRole("button", { name: /review order/i }).click();

  const [request, response] = await Promise.all([
    page.waitForRequest((r) => r.url().endsWith("/api/orders") && r.method() === "POST"),
    page.waitForResponse((r) => r.url().endsWith("/api/orders") && r.request().method() === "POST"),
    page.getByRole("button", { name: /place order/i }).click(),
  ]);

  expect(request.postDataJSON().items[0].dailyMenu, "the checkout must say which menu the line is from").toBe(false);
  const body = (await response.json()) as { error?: string };
  expect(response.status(), `the order was refused: ${body.error}`).toBeLessThan(300);

  await expect(page).toHaveURL(/\/orders\/SAV-/, { timeout: 15_000 });
});
