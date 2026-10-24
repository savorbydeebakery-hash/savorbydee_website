// The Worker entry point (wrangler.jsonc "main").
//
// OpenNext builds .open-next/worker.js, which answers web requests but has no
// `scheduled` handler. So the once-a-minute cron in wrangler.jsonc fired into
// nothing, and the unacknowledged-order reminder (app/api/cron/ack-watchdog)
// had never run once (found 2026-10-24). This wraps the built worker and
// answers the cron by calling that route, the same way a browser would.
//
// Plain JavaScript on purpose: .open-next/ only exists after a build, and a
// TypeScript import of it would fail the type check that runs before one.

import handler from "./.open-next/worker.js";

const worker = {
  fetch: handler.fetch,

  async scheduled(_controller, env, ctx) {
    const headers = env.CRON_SECRET ? { authorization: `Bearer ${env.CRON_SECRET}` } : {};
    // The host is never contacted: handler.fetch runs the app in-process.
    const request = new Request("https://savorbydee.in/api/cron/ack-watchdog", { headers });
    ctx.waitUntil(
      handler.fetch(request, env, ctx).then(async (res) => {
        if (!res.ok) console.error("[cron] ack-watchdog returned", res.status, await res.text());
      })
    );
  },
};

export default worker;

// Durable Object classes the built worker defines. None is bound in
// wrangler.jsonc today, but a binding added later must find its class here.
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
