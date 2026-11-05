/**
 * Which rate limit a request counts against, if any (client, 2026-11-05). Without one,
 * anyone could send orders in a loop, using up Today's Stock and setting off Dee's
 * alarms, or try order numbers and phone numbers until one matched.
 *
 * Generous per address, because on mobile data many real customers can share one.
 * Limits and periods are in wrangler.jsonc; cloudflare-worker.mjs applies them.
 */
export type LimitName = "WRITE_LIMIT" | "LOOKUP_LIMIT";

export function limitFor(request: Request): LimitName | null {
  const { pathname } = new URL(request.url);
  if (request.method === "POST" && pathname.startsWith("/api/")) return "WRITE_LIMIT";
  if (request.method === "GET" && pathname === "/api/orders") return "LOOKUP_LIMIT";
  return null;
}
