import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { isShareableRequest, isShareableResponse, pageCacheKey } from "./page-cache";

const req = (path: string, init?: RequestInit) => new Request(`https://savorbydee.in${path}`, init);

describe("which requests can share a saved page", () => {
  it.each(["/", "/menu", "/menu/daily", "/menu/cheesecakes", "/gallery", "/about", "/custom-cake", "/policies/terms", "/menu?category=cookies"])(
    "%s can",
    (path) => expect(isShareableRequest(req(path))).toBe(true)
  );

  it.each([
    "/cart",
    "/cart/checkout",
    "/login",
    "/account",
    "/admin",
    "/admin/gallery",
    "/orders/lookup",
    "/orders/SBD-1",
    "/reset-password",
    "/api/orders",
    "/api/push/key",
    "/menu/daily/extra",
    "/sitemap.xml",
  ])("%s never does", (path) => expect(isShareableRequest(req(path))).toBe(false));

  it("anything but reading a page never does", () => {
    expect(isShareableRequest(req("/menu", { method: "POST" }))).toBe(false);
    expect(isShareableRequest(req("/menu", { method: "HEAD" }))).toBe(false);
  });

  it("someone signed in never does, on any page", () => {
    for (const cookie of ["sb-abc-auth-token=x", "a=1; sb-abc-auth-token.0=x", "sb-abc-auth-token.1=x; b=2"]) {
      expect(isShareableRequest(req("/menu", { headers: { cookie } }))).toBe(false);
    }
    expect(isShareableRequest(req("/menu", { headers: { authorization: "Bearer x" } }))).toBe(false);
    // Other cookies don't change the page.
    expect(isShareableRequest(req("/menu", { headers: { cookie: "theme=dark" } }))).toBe(true);
  });
});

describe("the name a page is saved under", () => {
  const key = (path: string, headers?: HeadersInit, version = "v1") => pageCacheKey(req(path, { headers }), version);

  it("ignores links' tracking tags, so a rush from Instagram shares one copy", async () => {
    const plain = await key("/menu");
    expect(await key("/menu?fbclid=abc")).toBe(plain);
    expect(await key("/menu?utm_source=ig&igsh=xyz")).toBe(plain);
  });

  it("keeps what changes the page, in any order", async () => {
    expect(await key("/menu?category=cookies")).not.toBe(await key("/menu"));
    expect(await key("/menu?category=a&tag=b")).toBe(await key("/menu?tag=b&category=a"));
    expect(await key("/menu")).not.toBe(await key("/gallery"));
  });

  it("never mixes up a whole page with page data", async () => {
    expect(await key("/menu", { RSC: "1" })).not.toBe(await key("/menu"));
    expect(await key("/menu", { RSC: "1", "Next-Router-State-Tree": "a" })).not.toBe(
      await key("/menu", { RSC: "1", "Next-Router-State-Tree": "b" })
    );
  });

  it("starts afresh with each deploy", async () => {
    expect(await key("/menu", undefined, "v2")).not.toBe(await key("/menu", undefined, "v1"));
  });
});

describe("which answers get saved", () => {
  const page = (status: number, headers: Record<string, string>) => new Response(status === 307 ? null : "x", { status, headers });

  it("complete pages and page data", () => {
    expect(isShareableResponse(page(200, { "content-type": "text/html; charset=utf-8" }))).toBe(true);
    expect(isShareableResponse(page(200, { "content-type": "text/x-component" }))).toBe(true);
  });

  it("nothing that failed, redirected, set a cookie or isn't a page", () => {
    for (const status of [307, 404, 500, 503]) expect(isShareableResponse(page(status, { "content-type": "text/html" }))).toBe(false);
    expect(isShareableResponse(page(200, { "content-type": "text/html", "set-cookie": "a=1" }))).toBe(false);
    expect(isShareableResponse(page(200, { "content-type": "application/json" }))).toBe(false);
  });
});

describe("links", () => {
  // next/link fetches every page it can see in the background: about 26 requests per
  // page view, which used up the Worker's limit (client, 2026-11-05).
  it("all go through the site's Link, which doesn't", () => {
    const direct: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(name) && !path.endsWith(join("site", "link.tsx")) && /from ["']next\/link["']/.test(readFileSync(path, "utf8"))) direct.push(path);
      }
    };
    ["app", "components", "lib"].forEach(walk);
    expect(direct).toEqual([]);
  });
});
