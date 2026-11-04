import { test, expect, devices } from "@playwright/test";
import { fillSignIn } from "./helpers/sign-in";

/**
 * Protections a browser takes from the server, read as sent. Easy to lose in a
 * config change without anything visibly breaking.
 */
test.describe("site security", () => {
  test("every page sends the protective headers and doesn't advertise its stack", async ({ request }) => {
    for (const path of ["/", "/login", "/menu"]) {
      const h = (await request.get(path)).headers();
      expect(h["x-frame-options"], path).toBe("DENY");
      expect(h["x-content-type-options"], path).toBe("nosniff");
      expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
      expect(h["permissions-policy"], path).toContain("camera=()");
      expect(h["x-powered-by"], path).toBeUndefined();
    }
  });

  test("anonymous visitors can't run the scheduled job", async ({ request }) => {
    expect((await request.get("/api/cron/ack-watchdog")).status()).toBe(401);
  });

  // Closed in cloudflare-worker.mjs: it has critical advisories and nothing uses it.
  test("the image endpoint is closed, however it's spelled, and photos still load", async ({ request, page }) => {
    const query = "?url=%2Fhero%2Fcelebration-cakes-v3.webp&w=640&q=75";
    for (const path of ["/_next/image", "/_next/image/", "/_next//image", "/%5Fnext/image", "/_next/%69mage", "/_NEXT/IMAGE"]) {
      expect((await request.get(path + query)).status(), path).toBe(404);
    }

    const usedIt: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/_next/image")) usedIt.push(r.url());
    });
    await page.goto("/gallery");
    await page.waitForLoadState("networkidle");
    const firstPhoto = page.locator("main img").first();
    await expect(firstPhoto).toBeVisible();
    await expect.poll(() => firstPhoto.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    expect(usedIt, "a page still asks for the closed endpoint").toEqual([]);
  });
});

test.describe("phone header", () => {
  test.use({ viewport: devices["Pixel 7"].viewport, hasTouch: true });

  test("the top right is a profile button, and the cart is in the bottom bar", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    const profile = header.getByRole("link", { name: "My profile" });
    await expect(profile).toBeVisible();
    await expect(profile).toHaveAttribute("href", "/account");
    await expect(header.getByRole("link", { name: "Cart" })).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: /Cart/ })).toBeVisible();
  });

  test("the header is solid at every scroll position, so nothing shows through it", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle");
    const header = page.locator("header");
    for (const y of [0, 10, 40, 79, 300]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(150);
      const ground = await header.evaluate((e: HTMLElement) => getComputedStyle(e).backgroundColor);
      // Any see-through colour reads as "transparent", "rgba(…)" or "… / 0.5".
      expect(ground, `at ${y}px down the page`).not.toMatch(/transparent|rgba\(|\/ /);
    }
  });

  test("signed in, the profile button opens the profile", async ({ page }) => {
    const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
    test.skip(!email || !password, "Needs the admin login from CI's secrets.");
    await page.goto("/login?next=/account");
    await fillSignIn(page, email!, password!);
    // By path, not the glob "**/account": that also matches the login page's own
    // /login?next=/account, so it finishes at once and abandons the sign-in.
    const onProfile = (url: URL) => url.pathname === "/account";
    await Promise.all([
      page.waitForURL(onProfile),
      page.locator("form").getByRole("button", { name: /sign in/i }).click(),
    ]);
    await page.goto("/");
    const profile = page.locator("header").getByRole("link", { name: "My profile" });
    await expect(profile).toBeVisible();
    // Only the signed-out button has this label, so this waits for the header to
    // know who is here. Without it the rest also passes for a signed-out visitor.
    await expect(profile).not.toHaveAttribute("aria-label", "My profile");
    await expect(page.locator("header").getByRole("link", { name: "Cart" })).toBeHidden();
    await expect(async () => {
      await profile.click();
      await expect(page).toHaveURL(onProfile, { timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "My Account" })).toBeVisible();
  });
});
