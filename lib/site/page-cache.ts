/**
 * Which pages the Worker may save for a moment, and under what name (client,
 * 2026-11-05). Every visitor used to have each page built from scratch, and a stress
 * test failed 42% of requests at one page a second with "Worker exceeded resource
 * limits". The first visitor's page is now saved for 30 seconds and the rest get the
 * copy, which costs next to nothing. Used by cloudflare-worker.mjs.
 *
 * Safe to share because these pages read no cookies: who's signed in is worked out
 * in the browser, and the cart lives there too. The cart, checkout, sign-in and order
 * lookup are empty shells from the server, filled in on the phone. Up to 30 seconds
 * stale is fine because /api/orders rechecks price, stock, sold out and opening hours
 * itself.
 *
 * Not /orders/<id>: its address carries the customer's phone number, which Next writes
 * into the page, so it shouldn't sit in a cache however briefly.
 *
 * A list of pages rather than a list of exceptions, so a new page isn't shared with
 * strangers until someone decides it should be.
 */
const PUBLIC_PAGES = [
  /^\/$/,
  /^\/menu(\/[^/]+)?$/,
  /^\/gallery$/,
  /^\/about$/,
  /^\/custom-cake$/,
  /^\/policies\/[^/]+$/,
  /^\/cart(\/checkout)?$/,
  /^\/login$/,
  /^\/forgot-password$/,
  /^\/orders\/lookup$/,
];

/** Added by Instagram, Google and the like. Left in, every link clicked would be its own page. */
const TRACKING_PARAM = /^(utm_.*|fbclid|gclid|gbraid|wbraid|msclkid|ttclid|igsh|igshid|mc_cid|mc_eid)$/i;

/** What makes Next answer the same address differently: page data, not a whole page. */
const ROUTER_HEADERS = [
  "rsc",
  "next-router-prefetch",
  "next-router-segment-prefetch",
  "next-router-state-tree",
  "next-url",
];

const SHAREABLE_TYPE = /^(text\/html|text\/x-component)/i;
const SIGNED_IN_COOKIE = /(?:^|;\s*)sb-[^=;]*auth-token/;

export const PAGE_CACHE_SECONDS = 30;

/** Signed-in visitors always get a fresh page, so staff see their changes at once. */
export function isShareableRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  if (request.headers.has("authorization")) return false;
  if (SIGNED_IN_COOKIE.test(request.headers.get("cookie") ?? "")) return false;
  const { pathname } = new URL(request.url);
  return PUBLIC_PAGES.some((page) => page.test(pathname));
}

/**
 * The name a saved page goes under. The router headers are part of it, so whole pages
 * and page data can't be handed out for each other, and so is the deploy's version,
 * because a page from the last deploy points at script files that no longer exist.
 */
export async function pageCacheKey(request: Request, version: string): Promise<string> {
  const url = new URL(request.url);
  const params = [...url.searchParams.entries()]
    .filter(([name]) => !TRACKING_PARAM.test(name))
    .sort(([a], [b]) => a.localeCompare(b));
  const router = ROUTER_HEADERS.map((name) => `${name}:${request.headers.get(name) ?? ""}`).join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(router));
  const variant = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  const key = new URL(`${url.origin}/__page-cache/${encodeURIComponent(version)}/${variant}${url.pathname}`);
  for (const [name, value] of params) key.searchParams.append(name, value);
  return key.toString();
}

/** Only a complete, ordinary page. An error, a redirect or anything setting a cookie stays unsaved. */
export function isShareableResponse(response: Response): boolean {
  return (
    response.status === 200 &&
    !response.headers.has("set-cookie") &&
    SHAREABLE_TYPE.test(response.headers.get("content-type") ?? "")
  );
}
