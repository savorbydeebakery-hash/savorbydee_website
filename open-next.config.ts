import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import kvTagCache from "@opennextjs/cloudflare/overrides/tag-cache/kv-next-tag-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

export default {
  // Force webpack bundler: Turbopack creates symlinks in .next output that
  // OpenNext's copyTracedFiles cannot recreate on Windows (EPERM without
  // admin/Developer Mode). Webpack traces real files instead.
  buildCommand: "next build --webpack",
  ...defineCloudflareConfig({
    incrementalCache: kvIncrementalCache,
    tagCache: kvTagCache,
    queue: memoryQueue,
  }),
};