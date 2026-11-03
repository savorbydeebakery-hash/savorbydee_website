import { test, expect } from "@playwright/test";

/**
 * What Google receives, read as Google reads it: the raw response, no browser.
 * These are easy to lose without anyone noticing, and the first sign would be
 * pages dropping out of search weeks later.
 */
test.describe("search engines", () => {
  test("the sitemap lists the public pages and no private ones", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    for (const path of ["/menu<", "/menu/daily<", "/custom-cake<", "/about<", "/gallery<", "/policies/contact<"]) {
      expect(xml, `missing ${path}`).toContain(path);
    }
    for (const path of ["/admin", "/cart", "/login", "/orders", "/account"]) {
      expect(xml, `should not list ${path}`).not.toContain(`in${path}`);
    }
  });

  test("robots.txt allows the site, blocks the admin and names the sitemap", async ({ request }) => {
    const txt = await (await request.get("/robots.txt")).text();
    expect(txt).toContain("Disallow: /admin");
    expect(txt).toContain("sitemap.xml");
    expect(txt).not.toMatch(/User-agent: \*\s*\n\s*Disallow: \/\s*$/m);
  });

  for (const [path, canonical] of [
    ["/", "https://savorbydee.in"],
    ["/menu", "https://savorbydee.in/menu"],
    ["/menu/daily", "https://savorbydee.in/menu/daily"],
    ["/custom-cake", "https://savorbydee.in/custom-cake"],
    ["/about", "https://savorbydee.in/about"],
    ["/policies/refunds", "https://savorbydee.in/policies/refunds"],
  ] as const) {
    test(`${path} has its own title, description and canonical, and can be indexed`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect(res.headers()["x-robots-tag"] ?? "").not.toContain("noindex");
      const html = await res.text();
      expect(html).toContain(`<link rel="canonical" href="${canonical}"`);
      expect(html).toMatch(/<title>[^<]*Savor by Dee[^<]*<\/title>/);
      expect(html).toMatch(/<meta name="description" content="[^"]{50,}"/);
      expect(html).not.toMatch(/<meta name="robots" content="[^"]*noindex/);
    });
  }

  test("private pages ask not to be indexed", async ({ request }) => {
    for (const path of ["/cart", "/cart/checkout", "/login", "/orders/lookup", "/forgot-password", "/reset-password"]) {
      const res = await request.get(path);
      expect(res.headers()["x-robots-tag"], `${path} must be noindex`).toContain("noindex");
    }
  });

  test("www goes to the same page on the main address", async ({ request, baseURL }) => {
    test.skip(!baseURL?.includes("savorbydee.in"), "Only the live site has a www address.");
    for (const [path, target] of [["/", "https://savorbydee.in/"], ["/about", "https://savorbydee.in/about"], ["/menu/cookies", "https://savorbydee.in/menu/cookies"]]) {
      const res = await request.get(`https://www.savorbydee.in${path}`, { maxRedirects: 0 });
      expect(res.status(), path).toBe(308);
      expect(res.headers().location, path).toBe(target);
    }
  });

  test("the homepage describes the bakery", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).toContain('"@type":"Bakery"');
    expect(html).toContain('"addressLocality":"Shillong"');
    expect(html).not.toContain("aggregateRating");
  });
});
