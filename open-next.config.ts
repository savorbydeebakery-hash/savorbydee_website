import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache.json";
import r2TagCache from "@opennextjs/cloudflare/overrides/tag-cache/r2-tag-cache.json";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue.json";

export default defineCloudflareConfig({
  overrides: {
    incrementalCache: r2IncrementalCache,
    tagCache: r2TagCache,
    queue: memoryQueue,
  },
});