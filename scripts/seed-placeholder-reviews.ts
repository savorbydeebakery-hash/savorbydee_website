/**
 * Inserts (or removes) clearly-marked placeholder reviews.
 *
 * WHY THEY READ AS PLACEHOLDERS
 * These are written so no visitor could mistake them for real testimonials.
 * That is deliberate. Inventing customer names and putting fabricated praise
 * under them publishes them as genuine — the same problem as the "500+ Happy
 * Customers" and 4.9-star figures that were removed from this site earlier for
 * being made up. Sample copy that announces itself costs nothing and cannot
 * mislead anyone.
 *
 * They exist to show the carousel's layout and rotation. Replace them with
 * real reviews in Admin -> Reviews before this site goes to a public domain.
 *
 * Bodies vary in length on purpose: the carousel sets its own height from the
 * tallest slide, so a run of equal-length samples would hide any layout
 * problem the real, uneven ones will cause.
 *
 * Usage:
 *   npx tsx --env-file=.dev.vars scripts/seed-placeholder-reviews.ts
 *   npx tsx --env-file=.dev.vars scripts/seed-placeholder-reviews.ts --remove
 */
import { createAdminClient } from "../lib/supabase/admin";

/** Every seeded row carries this, so removal never touches a real review. */
const MARKER = "Placeholder";

const PLACEHOLDERS = [
  {
    author_name: MARKER,
    body: "Sample review — replace this in Admin → Reviews. Short entries like this one show how the carousel handles a brief quote.",
    item_name: "Sample entry",
    rating: 5,
    sort_order: 1,
  },
  {
    author_name: MARKER,
    body: "Sample review — replace this in Admin → Reviews. This one is deliberately longer, so you can see how the panel grows for a customer who writes a few sentences rather than one line, and where the text starts to wrap on a narrow phone screen.",
    item_name: "Sample entry",
    rating: 5,
    sort_order: 2,
  },
  {
    author_name: MARKER,
    body: "Sample review — replace this in Admin → Reviews. A four-star entry, included so the star row is not identical on every slide.",
    item_name: "Sample entry",
    rating: 4,
    sort_order: 3,
  },
  {
    author_name: MARKER,
    body: "Sample review — replace this in Admin → Reviews. This one has no item attached, which is how a review about the service rather than one bake will look.",
    item_name: null,
    rating: 5,
    sort_order: 4,
  },
];

async function main() {
  const supabase = createAdminClient();
  const remove = process.argv.includes("--remove");

  if (remove) {
    const { error, count } = await supabase
      .from("reviews")
      .delete({ count: "exact" })
      .eq("author_name", MARKER);
    if (error) throw new Error(error.message);
    console.log(`Removed ${count ?? 0} placeholder review(s).`);
    return;
  }

  // Idempotent: clear any previous run first, so this never stacks duplicates.
  await supabase.from("reviews").delete().eq("author_name", MARKER);

  const { data, error } = await supabase
    .from("reviews")
    .insert(PLACEHOLDERS.map((p) => ({ ...p, is_active: true })))
    .select("id");
  if (error) throw new Error(error.message);

  console.log(`Inserted ${data?.length ?? 0} placeholder review(s).`);
  console.log("\nThese are SAMPLE text, not real customer reviews.");
  console.log("Replace them in Admin → Reviews, or remove them with:");
  console.log("  npx tsx --env-file=.dev.vars scripts/seed-placeholder-reviews.ts --remove");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
