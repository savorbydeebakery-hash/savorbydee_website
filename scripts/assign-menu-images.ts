/**
 * Give every active menu item an image.
 *
 * All 76 active items currently have image_url = null. Migrations 00011/00013/
 * 00014 were written to set these but were never applied to the live database,
 * so the menu renders as text-only cards.
 *
 * Two tiers, deliberately:
 *   EXACT   - the item name states the product type and a photo of exactly that
 *             type exists (Carrot -> carrot-cake.jpg). Not a judgement call.
 *   DEFAULT - no exact match, so the item gets a photo of its own category
 *             (a cheesecake photo on a cheesecake). Defensible for a menu
 *             thumbnail without claiming to be that specific bake.
 *
 * Nothing is invented: only the 20 photos already in the menu-items bucket are
 * used, and the mapping is printed before anything is written.
 *
 *   npx tsx --env-file=.dev.vars scripts/assign-menu-images.ts --dry
 *   npx tsx --env-file=.dev.vars scripts/assign-menu-images.ts
 *   npx tsx --env-file=.dev.vars scripts/assign-menu-images.ts --revert
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env vars");

const supabase = createClient(url, key);
const BUCKET_URL = `${url}/storage/v1/object/public/menu-items`;
const img = (f: string) => `${BUCKET_URL}/${f}`;

const DRY = process.argv.includes("--dry");
const REVERT = process.argv.includes("--revert");

/** Photo of exactly this product type. Matched on lowercased item name. */
const EXACT: Record<string, string> = {
  "carrot": "carrot-cake.jpg",
  "banana": "banana-bread.jpg",
  "banana & walnut": "banana-bread.jpg",
  "banana honey & oatmeal": "banana-bread.jpg",
  "chocolate": "choc-cake2.jpg",
  "choco-chip": "choc-cake3.jpg",
  "chocolate & walnut": "choc-cake3.jpg",
  "very berry": "berry-cake.jpg",
  "berries & cream": "berry-cake.jpg",
  "rich fruit cake (rum)": "fruit-cake.jpg",
  "coffee cupcake": "coffee-cake.jpg",
  "gooey brownies": "brownie.jpg",
  "tiramisu tub": "tiramisu.jpg",
  "pannacotta cup": "pudding.jpg",
  "thai mango pudding": "pudding.jpg",
  "cold cheesecake cup": "vanilla-cup.jpg",
  "blueberry cupcake": "cupcake2.jpg",
  "chocolate cupcake": "cupcake.jpg",
  "vanilla cupcake": "cupcake.jpg",
  "plain vanilla": "vanilla-cake.jpg",
  "choc truffle": "choc-cake.jpg",
  "triple layer chocolate": "layer-cake.jpg",
  "classic ny baked": "cheesecake.jpg",
};

/** Fallback: a photo of the item's own category. */
const BY_CATEGORY: Record<string, string> = {
  "Tea Cakes": "vanilla-cake.jpg",
  "Cheesecakes": "cheesecake.jpg",
  "Cupcakes, Muffins & Brownies": "cupcake.jpg",
  "Desserts": "dessert-cup.jpg",
  "Frosted Sponge Cakes": "layer-cake.jpg",
  // High Tea Nibbles is deliberately absent. It is the savoury range
  // (chicken sandwiches, patties, buns) and the only category-level photo
  // available is a pastry counter. A sandwich card showing a cake display
  // misleads someone about to order it, and the card renders cleanly with no
  // image, so these stay text-only until real photos exist.
};

type Row = { id: string; name: string; image_url: string | null; categories: { name: string } | null };

async function main() {
  if (REVERT) {
    const { error, count } = await supabase
      .from("menu_items")
      .update({ image_url: null }, { count: "exact" })
      .not("image_url", "is", null);
    console.log(error ? `Revert failed: ${error.message}` : `Reverted ${count ?? 0} items to null.`);
    return;
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, image_url, categories(name)")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  let exact = 0;
  let byCat = 0;
  let skipped = 0;
  const plan: { id: string; name: string; file: string; how: string }[] = [];

  for (const r of rows) {
    const cat = r.categories?.name ?? "";
    const hit = EXACT[r.name.trim().toLowerCase()];
    const file = hit ?? BY_CATEGORY[cat];
    if (!file) {
      skipped++;
      console.log(`  ?  ${r.name}  (no photo for category "${cat}")`);
      continue;
    }
    if (hit) exact++;
    else byCat++;
    plan.push({ id: r.id, name: r.name, file, how: hit ? "exact" : "category" });
  }

  console.log(
    `\n  ${rows.length} active items -> ${exact} exact, ${byCat} category, ${skipped} unmatched\n`
  );
  for (const p of plan.slice(0, 12)) {
    console.log(`  ${p.how === "exact" ? "=" : "~"}  ${p.name.padEnd(34)} ${p.file}`);
  }
  if (plan.length > 12) console.log(`  ... and ${plan.length - 12} more`);

  if (DRY) {
    console.log("\n  DRY RUN, nothing written. Re-run without --dry to apply.\n");
    return;
  }

  let ok = 0;
  for (const p of plan) {
    const { error: e } = await supabase
      .from("menu_items")
      .update({ image_url: img(p.file) })
      .eq("id", p.id);
    if (e) console.error(`  x ${p.name}: ${e.message}`);
    else ok++;
  }
  console.log(`\n  Updated ${ok}/${plan.length}. Undo with --revert.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
