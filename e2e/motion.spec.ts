import { test, expect } from "@playwright/test";

/**
 * The motion added for the client's "make it feel alive" pass.
 *
 * These assert behaviour a screenshot cannot: that the scroll-spy actually
 * tracks, that reveals leave nothing invisible, and that a visitor who asks
 * for reduced motion still gets a usable page. The preview browser reports
 * prefers-reduced-motion: reduce and throttles timers (see HANDOFF), so it is
 * the wrong place to check any of this — Playwright is a real browser.
 */

/**
 * Scroll so `id`'s section sits across the tracking band.
 *
 * The spy highlights the last section whose top has passed 45% of the
 * viewport, so scrolling a section flush to the top of the screen highlights
 * a LATER one. Tests have to put the section where the band is, not where the
 * eye is.
 */
async function scrollSectionIntoBand(page: import("@playwright/test").Page, id: string) {
  // Twice: the first scroll can be computed against a layout that is still
  // settling as images arrive, which lands the band on a neighbour.
  for (let i = 0; i < 2; i++) {
  await page.evaluate((sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) throw new Error(`no section ${sectionId}`);
    const rect = el.getBoundingClientRect();
    const middle = rect.top + window.scrollY + rect.height / 2;
    window.scrollTo(0, Math.max(0, middle - window.innerHeight * 0.45));
  }, id);
    // The spy runs off scroll events; give ScrollTrigger a frame or two.
    await page.waitForTimeout(400);
  }
}

test.describe("daily menu category sections", () => {
  test("the chip for the section you are reading is marked current", async ({ page }) => {
    await page.goto("/menu/daily");
    await page.waitForLoadState("networkidle");

    const chips = page.locator("[data-chip]");
    await expect(chips).toHaveCount(8);

    await scrollSectionIntoBand(page, "cat-snacks");
    await expect(page.locator('[data-chip="cat-snacks"][aria-current="location"]')).toBeVisible({
      timeout: 5000,
    });

    // And it moves on, rather than latching on the first section it saw.
    await scrollSectionIntoBand(page, "cat-mini-pizzas");
    await expect(
      page.locator('[data-chip="cat-mini-pizzas"][aria-current="location"]')
    ).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-chip="cat-snacks"][aria-current="location"]')).toHaveCount(0);

    // Exactly one chip is ever current.
    await expect(page.locator('[data-chip][aria-current="location"]')).toHaveCount(1);
  });

  test("every card is visible once its section has been reached", async ({ page }) => {
    await page.goto("/menu/daily");
    await page.waitForLoadState("networkidle");

    // The stagger animates FROM hidden, so a card left at opacity 0 would mean
    // the animation never finished — the failure mode that matters here.
    const lastSection = page.locator("#cat-mini-pizzas");
    await scrollSectionIntoBand(page, "cat-mini-pizzas");

    const cards = lastSection.locator(".menu-item-card");
    await expect(cards).toHaveCount(4);

    // NOT a check for opacity 1: a card is drawn at opacity-50 while the shop
    // is closed, which is styling and nothing to do with the stagger. What
    // must hold is that no card is left at 0 by an animation that never ran.
    for (const card of await cards.all()) {
      await expect(card).toBeVisible();
      const opacity = await card.evaluate((el) => Number(getComputedStyle(el).opacity));
      expect(opacity).toBeGreaterThan(0.4);
    }
  });
});

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("homepage sections are all visible with motion turned off", async ({ page }) => {
    await page.goto("/");

    // Reveal animates from hidden inside a no-preference matchMedia, so with
    // reduce the sections must simply be there. This is the regression that
    // would hide half the homepage from a visitor with the OS setting on.
    await expect(page.getByRole("heading", { name: "Two ways to order" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /About/i }).first()).toBeVisible();
  });

  test("the daily menu still tracks the section you are reading", async ({ page }) => {
    await page.goto("/menu/daily");
    await page.waitForLoadState("networkidle");
    await scrollSectionIntoBand(page, "cat-tea-cakes");

    // The scroll-spy is a position indicator, not decoration: it runs for
    // everyone. Only the chip row's own scrolling is made instant.
    await expect(page.locator('[data-chip="cat-tea-cakes"][aria-current="location"]')).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("the catalogue is never hidden by its own animation", () => {
  // /menu shipped with all 79 product cards at opacity 0 once: RevealGroup
  // kept the immediateRender default, so the hidden start state was painted
  // at load and only a firing trigger undid it. This is that page.
  test("every card on the preorder menu is visible at the top of the page", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    const hidden = await page.evaluate(
      () =>
        [...document.querySelectorAll(".kinetic-reveal-item")].filter(
          (el) => getComputedStyle(el).opacity === "0"
        ).length
    );
    const total = await page.locator(".kinetic-reveal-item").count();
    expect(total).toBeGreaterThan(20);
    expect(hidden, `${hidden} of ${total} cards invisible at scroll 0`).toBe(0);
  });
});

test.describe("motion leaves no trace on the layout", () => {
  test("reveal wrappers clear their transform once they have arrived", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Walk the page so every wrapper has run.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
    });
    await page.waitForTimeout(1200);

    // A transform on a wrapper makes it the containing block for any fixed
    // descendant — that is how the item modal ended up positioned inside a
    // section instead of the viewport. Parallax wrappers keep their transform
    // on an inner element, so every wrapper itself must be clean.
    const dirty = await page.evaluate(() =>
      [...document.querySelectorAll(".kinetic-reveal")]
        .filter((el) => {
          const t = getComputedStyle(el).transform;
          return Boolean(t) && t !== "none";
        })
        .map((el) => `${el.className}:${getComputedStyle(el).transform}`)
    );
    expect(dirty, `wrappers left with a transform: ${dirty.join(", ")}`).toEqual([]);
  });
});
