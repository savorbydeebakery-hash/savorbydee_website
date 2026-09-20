/**
 * Puts the client's named product photos on the menu items they belong to.
 *
 * Source: the two folders in her Google Drive, "Daily Menu" and "Preorders",
 * where each file is named after the bake. That is the whole reason this can
 * be automated at all — the mapping below is her filename to the exact
 * menu_items.name, and the script refuses to write if any name does not match
 * exactly one active item. A fuzzy match is how a Chicken Quiche photo ends up
 * on a Mixed Vegetable Quiche.
 *
 * The originals are 3-5 MB phone photos. They are resized to 1400px on the
 * long edge before upload: a menu thumbnail is never displayed above ~600px,
 * and shipping 5 MB per card would make the menu unusable on Shillong mobile
 * data. ffmpeg does the resize because it is already a dependency of this
 * machine's toolchain and sharp does not build on Workers.
 *
 * Usage (folder = the unzipped Drive download):
 *   npx tsx --env-file=.dev.vars scripts/assign-drive-photos.ts <folder> --dry
 *   npx tsx --env-file=.dev.vars scripts/assign-drive-photos.ts <folder>
 *   npx tsx --env-file=.dev.vars scripts/assign-drive-photos.ts --revert
 */
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";
import { createAdminClient } from "../lib/supabase/admin";

const BUCKET = "menu-items";
const PREFIX = "client-photos";
const MAX_EDGE = 1400;

/**
 * Her filename -> the items it belongs on.
 *
 * Where one photo covers a product sold in two sizes (a cupcake and its box of
 * four), both get it: they are the same bake, photographed once. Where her
 * name does not name one of our items unambiguously, the entry is left out
 * entirely and listed at the end of the run instead of being guessed at.
 */
const MAP: { file: string; slug: string; items: string[] }[] = [
  // --- Daily Menu ---
  { file: "Cheesy Chicken Quiche.jpg", slug: "chicken-quiche", items: ["Chicken Quiche"] },
  { file: "Chicken Kheema Stuffed Buns.jpg", slug: "chicken-kheema-buns", items: ["Chicken Kheema Buns"] },
  { file: "Chicken Patties.jpg", slug: "chicken-patties", items: ["Chicken Patties"] },
  { file: "Chocolate Cupcake.jpg", slug: "chocolate-cupcake", items: ["Chocolate Cupcake", "Chocolate Cupcake Box Of 4"] },
  { file: "Chocolate Mini Tea Loaf.jpg", slug: "chocolate-mini-tea-loaf", items: ["Chocolate Mini Tea Loaf 250 Gms"] },
  { file: "Fudge Walnut Brownie.jpg", slug: "fudge-walnut-brownie", items: ["Fudge Walnut Brownie"] },
  { file: "Gooey Brownie.jpg", slug: "gooey-brownie", items: ["Gooey Brownies With A Rocky Ganache Top"] },
  { file: "Jamdrop Cookies.jpg", slug: "jam-drop-cookies", items: ["Jam Drop Cookies 100 Gms"] },
  { file: "Korean Buns.jpg", slug: "korean-buns", items: ["Korean Buns"] },
  { file: "Mini Marble Chocolate swiss rolls.jpg", slug: "mini-marbled-swiss-rolls", items: ["Mini Marbled Swiss Rolls"] },
  { file: "Pork Sausage Single serve pizza.jpg", slug: "pork-sausage-mini-pizza", items: ["Pork Sausage Mini Pizza"] },
  { file: "Red Velvet Cupcake.jpg", slug: "red-velvet-cupcake", items: ["Red Velvet Cupcake", "Red Velvet Cupcake Box Of 4"] },

  // --- Preorders ---
  { file: "Blueberry and lemon Cupcake.jpg", slug: "blueberry-cupcake", items: ["Blueberry Cupcake"] },
  { file: "Lemon Tartlettes.jpg", slug: "lemon-tartlettes", items: ["Tartlettes - Lemon Curd"] },
  { file: "Mini Chocolate Donut.jpg", slug: "mini-choc-doughnuts", items: ["Mini Choc Doughnuts"] },
  { file: "New York Bakes Cheesecake.jpg", slug: "classic-ny-baked", items: ["Classic NY Baked"] },
  { file: "Strawberry Cheesecake Bento.jpg", slug: "strawberry-cheesecake", items: ["Strawberry"] },
];

async function main() {
  const supabase = createAdminClient();
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");

  if (args.includes("--revert")) {
    const { error, count } = await supabase
      .from("menu_items")
      .update({ image_url: null }, { count: "exact" })
      .like("image_url", `%/${BUCKET}/${PREFIX}/%`);
    console.log(error ? `Revert failed: ${error.message}` : `Cleared the photo on ${count ?? 0} item(s).`);
    return;
  }

  const folder = args.find((a) => !a.startsWith("--"));
  if (!folder) throw new Error("Pass the unzipped Drive folder as the first argument.");

  // Files can sit in subfolders of the download; index by basename.
  const found = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else found.set(entry.name, full);
    }
  };
  walk(folder);

  const { data: rows, error } = await supabase
    .from("menu_items")
    .select("id, name, image_url")
    .eq("is_active", true);
  if (error) throw new Error(error.message);

  // Resolve everything before writing anything, so a typo stops the run rather
  // than leaving half the menu updated.
  const problems: string[] = [];
  const plan = MAP.map((m) => {
    const source = found.get(m.file);
    if (!source) problems.push(`missing file: ${m.file}`);
    const targets = m.items.map((name) => {
      const hits = (rows ?? []).filter((r) => r.name === name);
      if (hits.length !== 1) problems.push(`"${name}" matches ${hits.length} active items`);
      return hits[0];
    });
    return { ...m, source, targets };
  });
  if (problems.length) throw new Error(`Nothing written:\n  ${problems.join("\n  ")}`);

  for (const p of plan) {
    for (const t of p.targets) {
      console.log(`  ${p.file.padEnd(38)} -> ${t.name}${t.image_url ? "  (replaces a photo)" : ""}`);
    }
  }
  if (dry) {
    console.log("\n  DRY RUN, nothing written.");
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "savor-photos-"));
  let updated = 0;

  for (const p of plan) {
    const resized = path.join(tmp, `${p.slug}.jpg`);
    execFileSync("ffmpeg", [
      "-v", "error", "-y", "-i", p.source!,
      // Only shrink: scaling a small photo up adds bytes and no detail.
      "-vf", `scale='min(${MAX_EDGE},iw)':'min(${MAX_EDGE},ih)':force_original_aspect_ratio=decrease`,
      "-q:v", "4", resized,
    ]);

    const objectPath = `${PREFIX}/${p.slug}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, fs.readFileSync(resized), { contentType: "image/jpeg", upsert: true });
    if (upErr) throw new Error(`Upload failed for ${p.file}: ${upErr.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const { error: updErr, count } = await supabase
      .from("menu_items")
      .update({ image_url: data.publicUrl }, { count: "exact" })
      .in("id", p.targets.map((t) => t.id));
    if (updErr) throw new Error(`Update failed for ${p.file}: ${updErr.message}`);
    updated += count ?? 0;
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nUploaded ${plan.length} photo(s), set on ${updated} item(s). Undo with --revert.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
