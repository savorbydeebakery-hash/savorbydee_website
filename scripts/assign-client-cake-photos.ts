/**
 * Puts the cake photos the client sent on the menu items they belong to.
 *
 * Source: 14 photos Dee sent on WhatsApp on 13 Sept 2026, each captioned with
 * the cake's name. The mapping below goes from her caption to the exact
 * menu_items.name, and the script refuses to write if any name does not match
 * exactly one active item. That is the whole point: a guessed or fuzzy match
 * is how a Black Forest photo ends up on a White Forest card.
 *
 * Where her caption names one cake that the catalogue sells under two names
 * (the daily 500g size and the preorder cake), both get the photo:
 *   "Chocolate mousse 1/2kg"  -> Chocolate Mousse Cake 500 Gms, Chocolate Mousse
 *   "This is our coffee cake" -> Coffee Cake 500Gms, Coffee Cream
 *
 * Photos go to the menu-items bucket under client-photos/, named after the
 * cake, and are served through the Supabase transform loader like every other
 * menu image.
 *
 * Usage (folder = the WhatsApp export):
 *   npx tsx --env-file=.dev.vars scripts/assign-client-cake-photos.ts <folder> --dry
 *   npx tsx --env-file=.dev.vars scripts/assign-client-cake-photos.ts <folder>
 *   npx tsx --env-file=.dev.vars scripts/assign-client-cake-photos.ts --revert
 */
import fs from "fs";
import path from "path";
import { createAdminClient } from "../lib/supabase/admin";

const BUCKET = "menu-items";
const PREFIX = "client-photos";

/** WhatsApp export filename -> her caption -> the items it belongs on. */
const PHOTOS: { file: string; caption: string; slug: string; items: string[] }[] = [
  { file: "00000574-PHOTO-2026-09-13-18-02-25.jpg", caption: "Vanilla", slug: "vanilla-mascarpone", items: ["Vanilla Mascarpone"] },
  { file: "00000575-PHOTO-2026-09-13-18-02-25.jpg", caption: "Funfetti", slug: "funfetti", items: ["Funfetti"] },
  { file: "00000576-PHOTO-2026-09-13-18-02-27.jpg", caption: "Red Velvet", slug: "red-velvet", items: ["Red Velvet"] },
  { file: "00000577-PHOTO-2026-09-13-18-02-27.jpg", caption: "Chocolate mousse 1/2kg", slug: "chocolate-mousse", items: ["Chocolate Mousse Cake 500 Gms", "Chocolate Mousse"] },
  { file: "00000578-PHOTO-2026-09-13-18-02-27.jpg", caption: "Black Forest 1/2kg", slug: "black-forest", items: ["Black Forest"] },
  { file: "00000579-PHOTO-2026-09-13-18-02-27.jpg", caption: "Chocolate oreo", slug: "chocolate-oreo", items: ["Chocolate Oreo Cake"] },
  { file: "00000580-PHOTO-2026-09-13-18-02-28.jpg", caption: "Sinful Chocolate Indulgence", slug: "sinful-chocolate-indulgence", items: ["Sinful Chocolate Indulgence"] },
  { file: "00000581-PHOTO-2026-09-13-18-02-28.jpg", caption: "Choconilla", slug: "choconilla", items: ["Choconilla"] },
  { file: "00000582-PHOTO-2026-09-13-18-02-28.jpg", caption: "Tiramisu", slug: "tiramisu-with-liqueur", items: ["Tiramisu with Liqueur"] },
  { file: "00000583-PHOTO-2026-09-13-18-02-29.jpg", caption: "Chocolate Hazelnut", slug: "chocolate-hazelnut-crunch", items: ["Chocolate Hazelnut Crunch"] },
  { file: "00000584-PHOTO-2026-09-13-18-02-29.jpg", caption: "Chocolate truffle", slug: "chocolate-truffle", items: ["Chocolate Truffle Cake"] },
  { file: "00000585-PHOTO-2026-09-13-18-02-29.jpg", caption: "Nutty truffle", slug: "nutty-chocolate-truffle", items: ["Nutty Chocolate Truffle"] },
  { file: "00000586-PHOTO-2026-09-13-18-02-30.jpg", caption: "For the berries and Cream cake", slug: "berries-and-cream", items: ["Berries & Cream"] },
  { file: "00000587-PHOTO-2026-09-13-18-02-30.jpg", caption: "This is our coffee cake", slug: "coffee-cake", items: ["Coffee Cake 500Gms", "Coffee Cream"] },
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
  if (!folder) throw new Error("Pass the WhatsApp export folder as the first argument.");

  // Resolve every name before touching anything, so a typo stops the run
  // instead of leaving half the menu updated.
  const { data: rows, error } = await supabase
    .from("menu_items")
    .select("id, name, image_url")
    .eq("is_active", true);
  if (error) throw new Error(error.message);

  const problems: string[] = [];
  const plan = PHOTOS.map((p) => {
    const file = path.join(folder, p.file);
    if (!fs.existsSync(file)) problems.push(`missing file ${p.file} (${p.caption})`);
    const ids = p.items.map((name) => {
      const hits = (rows ?? []).filter((r) => r.name === name);
      if (hits.length !== 1) problems.push(`"${name}" matches ${hits.length} active items`);
      return hits[0];
    });
    return { ...p, file, targets: ids };
  });
  if (problems.length) throw new Error(`Nothing written:\n  ${problems.join("\n  ")}`);

  for (const p of plan) {
    for (const t of p.targets) {
      const note = t.image_url ? "  (replaces an existing photo)" : "";
      console.log(`  ${p.caption.padEnd(32)} -> ${t.name}${note}`);
    }
  }
  if (dry) {
    console.log("\n  DRY RUN, nothing written.");
    return;
  }

  let updated = 0;
  for (const p of plan) {
    const objectPath = `${PREFIX}/${p.slug}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, fs.readFileSync(p.file), { contentType: "image/jpeg", upsert: true });
    if (upErr) throw new Error(`Upload failed for ${p.caption}: ${upErr.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    const ids = p.targets.map((t) => t.id);
    const { error: updErr, count } = await supabase
      .from("menu_items")
      .update({ image_url: data.publicUrl }, { count: "exact" })
      .in("id", ids);
    if (updErr) throw new Error(`Update failed for ${p.caption}: ${updErr.message}`);
    updated += count ?? 0;
  }
  console.log(`\nUploaded ${plan.length} photo(s), set on ${updated} item(s). Undo with --revert.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
