import { test, expect, devices } from "@playwright/test";

/**
 * The Worker saves public pages for 30 seconds (lib/site/page-cache.ts). The rule that
 * matters: only what's the same for everyone is ever shared.
 *
 * Cloudflare's cache doesn't run on workers.dev addresses, so CI's run there checks the
 * safety rules, and the copy actually being reused is only checked on the real domain.
 */
const STATUS = "x-savor-cache";

test.describe("saved pages", () => {
  test("private pages are never saved", async ({ request }) => {
    for (const path of ["/cart", "/login", "/orders/lookup", "/api/push/key"]) {
      await request.get(path);
      const res = await request.get(path);
      expect(res.headers()[STATUS], path).toBeUndefined();
    }
    for (const path of ["/account", "/admin"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(307);
      expect(res.headers()[STATUS], path).toBeUndefined();
    }
  });

  test("someone signed in always gets a fresh page", async ({ request }) => {
    await request.get("/about");
    const res = await request.get("/about", { headers: { cookie: "sb-test-auth-token=not-a-real-session" } });
    expect(res.status()).toBe(200);
    expect(res.headers()[STATUS]).toBeUndefined();
  });

  test("a whole page and page data are never handed out for each other", async ({ request }) => {
    const page = () => request.get("/about");
    const firstData = await request.get("/about", { headers: { RSC: "1" }, maxRedirects: 0 });
    // Next sends this to an address carrying a check of those headers.
    const location = firstData.headers()["location"];
    const data = location ? await request.get(location, { headers: { RSC: "1" } }) : firstData;

    for (let i = 0; i < 2; i++) expect((await page()).headers()["content-type"]).toContain("text/html");
    expect(data.headers()["content-type"]).toContain("text/x-component");
    if (location) {
      const again = await request.get(location, { headers: { RSC: "1" } });
      expect(again.headers()["content-type"]).toContain("text/x-component");
    }
  });

  test("browsers aren't told to keep a copy", async ({ request }) => {
    for (let i = 0; i < 2; i++) {
      const cacheControl = (await request.get("/gallery")).headers()["cache-control"];
      expect(cacheControl).toContain("no-store");
    }
  });

  test("the first visitor's page is reused, including from tracked links", async ({ request, baseURL }) => {
    test.skip(!baseURL || baseURL.includes("workers.dev") || baseURL.includes("localhost:3000"), "No cache on this address.");
    // A page nothing else in the suite is warming.
    const path = "/policies/privacy";
    await request.get(path);
    await expect
      .poll(async () => (await request.get(path)).headers()[STATUS], { timeout: 10_000 })
      .toBe("HIT");
    expect((await request.get(`${path}?fbclid=test&utm_source=instagram`)).headers()[STATUS]).toBe("HIT");
  });
});

test.describe("background fetching", () => {
  test.use({ viewport: devices["Pixel 7"].viewport, hasTouch: true, isMobile: true });

  test("a page view doesn't fetch other pages, and tapping a link still works", async ({ page }) => {
    const data: string[] = [];
    page.on("request", (r) => {
      if (new URL(r.url()).searchParams.has("_rsc")) data.push(r.url());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(1500);
    expect(data, "pages fetched in the background").toEqual([]);

    // Back up, because the bottom bar slides away while scrolling down.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      (window as unknown as { sameDocument: boolean }).sameDocument = true;
    });
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: /^Gallery/ }).click();
    await page.waitForURL((url) => url.pathname === "/gallery");
    await expect(page.getByRole("heading", { name: "Our Gallery" })).toBeVisible();
    // Moved without reloading the whole page.
    expect(await page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });
});

test("the About page is only about the bakery", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: /^About / })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Our Philosophy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gallery", exact: true })).toHaveCount(0);
  await expect(page.locator("main img")).toHaveCount(0);
});
