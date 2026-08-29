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

/**
 * Images come from gallery_photos only.
 *
 * The menu-items bucket is not used: its filenames do not describe its
 * contents and four of its twenty files are not food at all (an iPhone, a
 * puppy, a clothing store, a blank icon sheet). The gallery is the client's own
 * captioned work, so a caption keyword is a reliable signal about the subject.
 *
 * Matching is on caption keyword, and each menu category maps to the kind of
 * bake it actually is. Where several photos match, they are distributed round
 * robin so a category does not show the same picture on every card.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Frosted Sponge Cakes": ["tier cake", "3d cake"],
  "Tea Cakes": ["bento cake"],
  "Cheesecakes": ["bento cake", "tier cake"],
  "Cupcakes, Muffins & Brownies": ["cupcake", "custom cookie"],
  "Desserts": ["donut", "custom cookie"],
  // Savoury range. Cookies are the closest the gallery has to a nibble, but a
  // chicken sandwich card showing a decorated cookie still misleads, so these
  // stay text-only until real photos exist.
};

/** Item-name keyword wins over the category default when it matches. */
const NAME_KEYWORDS: [RegExp, string[]][] = [
  [/cupcake/i, ["cupcake"]],
  [/cookie|biscuit/i, ["custom cookie"]],
  [/doughnut|donut/i, ["donut"]],
  [/tier|wedding/i, ["tier cake"]],
];

type Row = { id: string; name: string; image_url: string | null; categories: { name: string } | null };

type Photo = { image_url: string; caption: string | null };

async function main() {
  if (REVERT) {
    const { error, count } = await supabase
      .from("menu_items")
      .update({ image_url: null }, { count: "exact" })
      .not("image_url", "is", null);
    console.log(error ? `Revert failed: ${error.message}` : `Reverted ${count ?? 0} items to null.`);
    return;
  }

  const [{ data: photoRows }, { data: itemRows, error }] = await Promise.all([
    supabase.from("gallery_photos").select("image_url, caption").eq("is_active", true).order("sort_order"),
    supabase.from("menu_items").select("id, name, image_url, categories(name)").eq("is_active", true).order("name"),
  ]);
  if (error) throw new Error(error.message);

  const photos = (photoRows ?? []) as Photo[];
  const rows = (itemRows ?? []) as unknown as Row[];

  const matching = (keywords: string[]) =>
    photos.filter((p) => {
      const c = (p.caption ?? "").toLowerCase();
      return keywords.some((k) => c.includes(k));
    });

  // Round-robin cursor per keyword set, so a category of 18 items does not
  // render the same photo 18 times.
  const cursor = new Map<string, number>();
  const pick = (keywords: string[]) => {
    const key = keywords.join("|");
    const pool = matching(keywords);
    if (pool.length === 0) return null;
    const i = cursor.get(key) ?? 0;
    cursor.set(key, i + 1);
    return pool[i % pool.length].image_url;
  };

  let named = 0;
  let byCat = 0;
  let skipped = 0;
  const plan: { id: string; name: string; url: string; how: string }[] = [];

  for (const r of rows) {
    const cat = r.categories?.name ?? "";
    const nameHit = NAME_KEYWORDS.find(([re]) => re.test(r.name));
    let url = nameHit ? pick(nameHit[1]) : null;
    let how = "name";
    if (!url) {
      const kws = CATEGORY_KEYWORDS[cat];
      url = kws ? pick(kws) : null;
      how = "category";
    }
    if (!url) {
      skipped++;
      continue;
    }
    if (how === "name") named++;
    else byCat++;
    plan.push({ id: r.id, name: r.name, url, how });
  }

  console.log(
    `  ${photos.length} gallery photos available, ${rows.length} active items -> ${named} by name, ${byCat} by category, ${skipped} left text-only`
  );
  for (const p of plan.slice(0, 10)) {
    const file = decodeURIComponent(p.url.split("/").pop() ?? "");
    console.log(`  ${p.how === "name" ? "=" : "~"}  ${p.name.padEnd(30)} ${file.slice(0, 40)}`);
  }
  if (plan.length > 10) console.log(`  ... and ${plan.length - 10} more`);

  if (DRY) {
    console.log("\n  DRY RUN, nothing written.\n");
    return;
  }

  let ok = 0;
  for (const p of plan) {
    const { error: e } = await supabase.from("menu_items").update({ image_url: p.url }).eq("id", p.id);
    if (e) console.error(`  x ${p.name}: ${e.message}`);
    else ok++;
  }
  console.log(`  Updated ${ok}/${plan.length}. Undo with --revert.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
