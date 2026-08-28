/**
 * One-off: re-stamp every Supabase Storage object with a 1-year Cache-Control.
 *
 * WHY
 * Supabase defaults uploads to `cacheControl: no-cache`. Verified against this
 * project — every object, and the /render/image/ transform endpoint too:
 *
 *   $ curl -sI .../storage/v1/object/public/gallery/savor-cake.jpg
 *   Cache-Control: no-cache
 *
 * That disables BOTH browser caching and Cloudflare edge caching, so every
 * image is re-fetched from the Tokyo origin on every page load, every visit.
 * It is the single largest cause of the slow image loading.
 *
 * There is no metadata-only PATCH in the Storage API, so the only way to change
 * cacheControl is to re-upload the bytes with the new header.
 *
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   npx tsx --env-file=.dev.vars scripts/fix-image-cache.ts          # all buckets
 *   npx tsx --env-file=.dev.vars scripts/fix-image-cache.ts gallery  # one bucket
 *   DRY_RUN=1 npx tsx --env-file=.dev.vars scripts/fix-image-cache.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: npx tsx --env-file=.dev.vars scripts/fix-image-cache.ts"
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ALL_BUCKETS = ["gallery", "menu-items", "promo-banners", "site-assets"];
const ONE_YEAR = "31536000";
const DRY_RUN = process.env.DRY_RUN === "1";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
};

function contentTypeFor(path: string, fallback: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? (fallback || "application/octet-stream");
}

/** Storage `list` is not recursive; folders come back as rows with a null id. */
async function walk(bucket: string, prefix = ""): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });

  if (error) {
    console.error(`  ! list ${bucket}/${prefix}: ${error.message}`);
    return [];
  }

  const files: string[] = [];
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) files.push(...(await walk(bucket, path)));
    else files.push(path);
  }
  return files;
}

async function restamp(bucket: string, path: string): Promise<boolean> {
  const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(path);
  if (dlErr || !blob) {
    console.error(`  ✗ ${path} — download: ${dlErr?.message ?? "empty"}`);
    return false;
  }

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, await blob.arrayBuffer(), {
      cacheControl: ONE_YEAR,
      upsert: true,
      contentType: contentTypeFor(path, blob.type),
    });

  if (upErr) {
    console.error(`  ✗ ${path} — upload: ${upErr.message}`);
    return false;
  }
  return true;
}

async function main() {
  const requested = process.argv[2];
  const buckets = requested ? [requested] : ALL_BUCKETS;

  if (DRY_RUN) console.log("DRY RUN — listing only, nothing will be written.\n");

  let ok = 0;
  let failed = 0;

  for (const bucket of buckets) {
    const paths = await walk(bucket);
    if (paths.length === 0) {
      console.log(`${bucket}: empty or unreadable — skipped`);
      continue;
    }

    console.log(`\n${bucket}: ${paths.length} objects`);
    for (const path of paths) {
      if (DRY_RUN) {
        console.log(`  · ${path}`);
        continue;
      }
      if (await restamp(bucket, path)) {
        ok++;
        process.stdout.write(`  ✓ ${path}\n`);
      } else {
        failed++;
      }
    }
  }

  if (!DRY_RUN) {
    console.log(`\nDone. ${ok} re-stamped, ${failed} failed.`);
    console.log(
      "\nVerify:\n  curl -sI " +
        `"${SUPABASE_URL}/storage/v1/object/public/gallery/savor-cake.jpg"` +
        ' | grep -i cache-control\n  → expect: cache-control: max-age=31536000'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
