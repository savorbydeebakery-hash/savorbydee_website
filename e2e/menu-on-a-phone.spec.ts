import { test, expect, devices, type Page } from "@playwright/test";

/**
 * The menus on a phone (client, 2026-11-04): two cards across, no gaps left by
 * the hidden backs of the cards, and on the Preorder Menu a category chip jumps
 * to its section without hiding the others, as Today's Menu already did.
 */
test.use({ viewport: devices["Pixel 7"].viewport, hasTouch: true, isMobile: true });

const sections = (page: Page) => page.locator("section[id^='cat-']");
const chips = (page: Page) => page.getByRole("navigation", { name: "Menu categories" }).locator("[data-chip]");

test.describe("Preorder Menu", () => {
  test("cards sit two across and fit the screen", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle"); // the page streams in, and swaps once as it lands
    const [a, b] = await Promise.all(
      [0, 1].map((i) => sections(page).first().locator(".menu-item-card").nth(i).boundingBox())
    );
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
    expect(b!.x).toBeGreaterThan(a!.x + a!.width);
    expect(b!.x + b!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    const [wide, screen] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(wide).toBeLessThanOrEqual(screen);
  });

  test("a category chip jumps there, and the page scrolls on to the next category", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle");
    const total = await sections(page).count();
    expect(total).toBeGreaterThan(2);

    const target = chips(page).nth(1);
    const id = (await target.getAttribute("data-chip"))!;
    await target.click();

    // Every section is still on the page.
    await expect(sections(page)).toHaveCount(total);
    const section = page.locator(`#${id}`);
    await expect(section.locator(".menu-item-card").first()).toBeInViewport();
    // Its heading lands clear of the header and the chips, not under them.
    const chipsBottom = (await page.getByRole("navigation", { name: "Menu categories" }).boundingBox())!;
    const heading = (await section.locator("h2").boundingBox())!;
    expect(heading.y).toBeGreaterThanOrEqual(chipsBottom.y + chipsBottom.height - 1);
    await expect(page.locator(`[data-chip="${id}"][aria-current="location"]`)).toBeVisible({ timeout: 5000 });

    // Carry on down: the next category comes up and its chip lights.
    const next = (await chips(page).nth(2).getAttribute("data-chip"))!;
    await page.locator(`#${next}`).evaluate((e: HTMLElement) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 200));
    await expect(page.locator(`[data-chip="${next}"][aria-current="location"]`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`#${next} .menu-item-card`).first()).toBeInViewport();
  });

  test("a card with a photo shows its price on top of the photo", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle");
    const chip = page.locator("[data-card-price]").first();
    test.skip((await chip.count()) === 0, "Preorder photos are switched off right now.");
    await chip.evaluate((e: HTMLElement) => e.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(1200);
    // Is the chip what's actually on top at that spot? It sat under the zoom lens.
    const onTop = await chip.evaluate((e: HTMLElement) => {
      e.style.pointerEvents = "auto"; // it ignores taps, so it would never be "hit"
      const r = e.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      e.style.pointerEvents = "";
      return hit === e;
    });
    expect(onTop, "something is painted over the price").toBe(true);
  });

  test("a link to a category opens there with the rest of the menu still on the page", async ({ page }) => {
    await page.goto("/menu");
    const total = await sections(page).count();
    const id = (await chips(page).nth(1).getAttribute("data-chip"))!;
    await page.goto(`/menu?category=${id.replace(/^cat-/, "")}`);
    await expect(sections(page)).toHaveCount(total);
    await expect(page.locator(`#${id} h2`)).toBeInViewport();
  });

  test("searching narrows the menu, and clearing it brings everything back", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle"); // typing before the page wakes up is lost
    const before = await page.locator(".menu-item-card").count();
    const name = (await page.locator(".menu-item-card").first().getAttribute("data-item-name"))!;
    await page.locator("#menu-search").fill(name);
    await expect.poll(() => page.locator(".menu-item-card").count()).toBeLessThan(before);
    await expect(page.locator(`.menu-item-card[data-item-name="${name}"]`).first()).toBeVisible();
    await page.locator("#menu-search").fill("");
    await expect(page.locator(".menu-item-card")).toHaveCount(before);
  });

  test("a long tag stays off the phone card but is in the item's pop-up", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle");
    const card = page.locator(".menu-item-card").first();
    const long = card.getByText("Produced in a kitchen");
    test.skip((await long.count()) === 0, "No item carries a long tag right now.");
    await expect(long).toBeHidden();
    await card.locator("[data-item-price]").click();
    const inPopUp = page.getByRole("dialog").getByRole("listitem").filter({ hasText: "Produced in a kitchen" });
    await expect(inPopUp).toBeVisible();
    // Several lines of text in a pill spill out of its rounded ends.
    const radius = await inPopUp.evaluate((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius));
    expect(radius).toBeLessThanOrEqual(16);
  });

  test("a card's description opens and closes, and Add to Cart opens the item", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle");
    const withDescription = page.locator(".menu-item-card").filter({ has: page.getByRole("button", { name: "View description" }) });
    const name = (await withDescription.first().getAttribute("data-item-name"))!;
    const card = page.locator(`.menu-item-card[data-item-name="${name}"]`).first();
    const back = card.locator('[data-card-face="back"]');

    await card.getByRole("button", { name: "View description" }).click();
    await expect(back).not.toHaveAttribute("inert", /.*/);
    await page.waitForTimeout(600);
    const fits = await back.locator("p").last().evaluate((p) => p.scrollHeight <= p.clientHeight + 1);
    expect(fits, "the description is cut off").toBe(true);
    await card.getByRole("button", { name: "Back", exact: true }).click();
    await expect(back).toHaveAttribute("inert", /.*/);

    await page.waitForTimeout(600);
    await card.locator("[data-item-price]").click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("no gaps", () => {
  for (const path of ["/menu", "/menu/daily"]) {
    test(`between the categories of ${path}`, async ({ page }) => {
      await page.goto(path);
      await sections(page).first().waitFor();
      const gaps = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("section[id^='cat-']")].slice(0, -1).map((s) => {
          const next = s.nextElementSibling!.getBoundingClientRect().top;
          // A card's lowest visible thing is a button. Not the card's own box,
          // which is the very thing that stretched and left the gap.
          const bottoms = [...s.querySelectorAll<HTMLElement>(".menu-item-card button")]
            .filter((b) => !b.closest('[data-card-face="back"]'))
            .map((b) => b.getBoundingClientRect().bottom);
          return { name: s.id, gap: Math.round(next - Math.max(...bottoms)) };
        })
      );
      expect(gaps.length).toBeGreaterThan(0);
      for (const { name, gap } of gaps) expect(gap, name).toBeLessThanOrEqual(60);
    });
  }

  test("a card's hidden description doesn't stretch it", async ({ page }) => {
    await page.goto("/menu/daily");
    await sections(page).first().waitFor();
    const backs = page.locator('.menu-item-card [data-card-face="back"]');
    expect(await backs.count()).toBeGreaterThan(0);
    await expect(backs.first()).toHaveCSS("position", "absolute");
  });

  test("under Best Sellers on the homepage", async ({ page }) => {
    await page.goto("/");
    const rail = page.locator("section").filter({ has: page.getByRole("heading", { name: "Best Sellers" }) }).last();
    await rail.waitFor();
    const lastThing = await rail.locator(".menu-item-card button").evaluateAll((buttons) =>
      Math.max(...buttons.filter((b) => !b.closest('[data-card-face="back"]')).map((b) => b.getBoundingClientRect().bottom))
    );
    const next = (await page.getByRole("heading", { name: "Something of your own" }).boundingBox())!;
    expect(next.y - lastThing).toBeLessThanOrEqual(80);
  });
});
