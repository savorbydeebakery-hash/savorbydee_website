import { test, expect } from "@playwright/test";

/**
 * A basket holds one menu or the other.
 *
 * Daily bakes are ready in about two hours; preorder items take a day or more
 * and a custom cake up to five. An order carries a single collection slot, so
 * a basket spanning both menus cannot honour either — whichever the customer
 * is given, one half is wrong. The rule is that today's items are ordered and
 * collected before a preorder basket is started.
 *
 * Enforced in three places, and this covers the one a customer meets:
 *   lib/cart/validation.ts  canAddToCart — the rule itself, unit tested
 *   lib/cart/store.ts       refuses the add, so no UI can bypass it
 *   app/api/orders/route.ts refuses a mixed body, for a hand-made request
 *
 * Needs an orderable item on today's menu. It skips, loudly and with a count,
 * when there is none — a rule nobody can exercise is a rule nobody knows is
 * broken, and a quiet skip reports green.
 */
test("a daily item locks the basket out of the preorder menu", async ({ page }) => {
  await page.goto("/menu/daily");

  const cards = page.locator("main .menu-item-card");
  await expect(cards.first()).toBeVisible();

  const orderable = page
    .locator('main .menu-item-card[data-orderable="true"]')
    .filter({ has: page.getByRole("button", { name: /add to cart/i }) })
    .first();

  // Wait for one rather than counting the instant the page arrives. Counting
  // immediately skipped on CI against a menu that had 45 orderable items,
  // while the same spec passed three times in a row locally — a skip that
  // says "there is no stock" when there is stock is worse than a failure,
  // because it reports green.
  const available = await orderable
    .waitFor({ state: "attached", timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  test.skip(
    !available,
    `No item on today's menu is orderable (${await cards.count()} cards on the page). ` +
      "Every daily item is probably at stock_count 0, so the one-menu-per-basket " +
      "rule cannot be exercised. Enter stock in Admin > Menu Items to turn this back on."
  );

  // Start from an empty basket regardless of what a previous spec left.
  await page.evaluate(() => window.localStorage.removeItem("savor-cart"));
  await page.reload();

  const dailyName = await orderable.getAttribute("data-item-name");
  await orderable.locator("button[data-item-price]").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /add to cart/i })
    .click();

  // The daily item is in, and knows which menu it came from.
  const afterDaily = await readCart(page);
  expect(afterDaily, `${dailyName} did not reach the basket`).toHaveLength(1);
  expect(afterDaily[0].dailyMenu).toBe(true);

  // Now try a preorder item.
  await page.goto("/menu");
  await page.getByRole("button", { name: /add to cart/i }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /add to cart/i }).click();

  // Refused, with a reason that says what to do about it.
  await expect(dialog).toContainText(/ready on a different schedule/i);
  await expect(dialog).toContainText(/order those first/i);

  // And nothing was added — the assertion that actually matters. A message
  // without the refusal behind it would be worse than no message.
  const afterPreorder = await readCart(page);
  expect(afterPreorder, "a preorder item was added to a basket of daily items").toHaveLength(1);
  expect(afterPreorder[0].dailyMenu).toBe(true);
});

async function readCart(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    try {
      const raw = window.localStorage.getItem("savor-cart");
      return raw ? (JSON.parse(raw).items ?? []) : [];
    } catch {
      return [];
    }
  }) as Promise<{ name: string; dailyMenu?: boolean }[]>;
}
