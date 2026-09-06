import { test, expect } from "@playwright/test";

/**
 * A menu card turns over to show its description, and turns back.
 *
 * Asserted on `inert` rather than on visibility. Both faces are always in the
 * DOM — that is what lets the browser animate between them — so neither is
 * ever `display: none`, and `toBeVisible()` would pass on the hidden one.
 * `inert` is also the part that actually matters for anyone not looking at the
 * screen: without it a screen reader reads the description of a card showing
 * its front, and Tab lands on the button behind it.
 *
 * Only preorder items carry descriptions today, so this runs against /menu.
 * Cards with nothing to say get no control at all, which is checked here too —
 * 104 of the 124 live items are in that state, and a button that turns the
 * card over to an empty panel would be on most of the menu.
 */
test("a menu card turns over to show its description", async ({ page }) => {
  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: /preorder menu/i }).first()).toBeVisible();

  const cards = page.locator("main .menu-item-card");
  await expect(cards.first()).toBeVisible();

  const flippable = cards.filter({ has: page.getByRole("button", { name: "View description" }) });
  const flippableCount = await flippable.count();
  expect(flippableCount, "no card on the preorder menu offers a description").toBeGreaterThan(0);

  // Not every card: the control only exists where there is something behind it.
  const total = await cards.count();
  expect(
    flippableCount,
    "every card offers a description — the control is no longer conditional on having one"
  ).toBeLessThan(total);

  // Pin the card by name before touching it. A locator built on
  // `has: getByRole("View description")` cannot be reused across the click:
  // flipping makes the front face inert, inert content leaves the
  // accessibility tree, and the filter then stops matching this card — so
  // `.first()` would quietly re-resolve to the next, unflipped one and the
  // assertion would fail against a card that was never clicked.
  const itemName = await flippable.first().getAttribute("data-item-name");
  const card = page.locator(`main .menu-item-card[data-item-name="${itemName}"]`);

  const front = card.locator('[data-card-face="front"]');
  const back = card.locator('[data-card-face="back"]');

  await expect(front).not.toHaveAttribute("inert", /.*/);
  await expect(back).toHaveAttribute("inert", /.*/);

  // The card must not change size as it turns, or every card below it jumps
  // down the page. Both faces share one grid cell, so the guarantee is that
  // they are the same height — asserted on the two faces at one moment rather
  // than on the card before and after the click, which measured across a
  // layout settle and a 500ms transition and was flaky on CI for that reason.
  const frontBox = await front.boundingBox();
  const backBox = await back.boundingBox();
  expect(backBox?.height).toBeCloseTo(frontBox?.height ?? 0, 0);

  await card.getByRole("button", { name: "View description" }).click();

  await expect(front).toHaveAttribute("inert", /.*/);
  await expect(back).not.toHaveAttribute("inert", /.*/);

  await card.getByRole("button", { name: "Back", exact: true }).click();
  await expect(front).not.toHaveAttribute("inert", /.*/);
  await expect(back).toHaveAttribute("inert", /.*/);
});

/**
 * The homepage leads with the two menus, not with a grid of items.
 */
test("the homepage offers both menus as cards", async ({ page }) => {
  await page.goto("/");

  const section = page.locator("section").filter({ hasText: "Two ways to order" }).first();
  await expect(section.getByRole("heading", { name: "Today's Menu" })).toBeVisible();
  await expect(section.getByRole("heading", { name: "Preorder Menu" })).toBeVisible();

  await expect(section.locator('a[href="/menu/daily"]')).toHaveCount(1);
  await expect(section.locator('a[href="/menu"]')).toHaveCount(1);

  // Both cards carry a photograph. A blank card would mean the gallery
  // fallback in lib/menu/menu-photo.ts stopped finding anything.
  await expect(section.locator("img")).toHaveCount(2);

  await section.locator('a[href="/menu/daily"]').click();
  await expect(page).toHaveURL(/\/menu\/daily/);
});
