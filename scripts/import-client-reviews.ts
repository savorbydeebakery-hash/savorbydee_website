/**
 * Replaces the placeholder reviews with the real ones the client sent.
 *
 * Source: 15 screenshots Dee sent on WhatsApp on 13 Sept 2026, two from Swiggy
 * and thirteen from Google. The text is transcribed as written, spelling and
 * emoji included; nothing is tidied into something the customer did not say.
 *
 * Attribution and stars follow what the screenshots actually show:
 *   - author_name is the platform, because the screenshots crop off the
 *     reviewer's name. The one reviewer who signed his review is named.
 *   - rating is null unless the review itself states a score (migration 00042).
 *     Most screenshots cut off the stars, and a default of 5 would publish a
 *     rating nobody gave.
 *   - item_name is set only where the review names the bake.
 *   - Two Google reviews were cut at "... More". They are kept up to where the
 *     screenshot ends, without an ellipsis.
 *
 * Usage:
 *   npx tsx --env-file=.dev.vars scripts/import-client-reviews.ts --dry
 *   npx tsx --env-file=.dev.vars scripts/import-client-reviews.ts
 *   npx tsx --env-file=.dev.vars scripts/import-client-reviews.ts --remove
 */
import { createAdminClient } from "../lib/supabase/admin";

const GOOGLE = "Google review";
const SWIGGY = "Swiggy customer";

/** Removal matches on these, so it never touches a review typed in admin. */
const SOURCES = [GOOGLE, SWIGGY, "Jonathan Benjamin"];

type Row = { author_name: string; body: string; item_name: string | null; rating: number | null };

// Ordered for the carousel: the fullest, most specific reviews lead.
const REVIEWS: Row[] = [
  {
    author_name: GOOGLE,
    body: "Savor by Dee is my go to place for my dessert cravings. They make such delicious desserts n savouries. They are so professional and dedicated. Always deliver food on time. Their packaging is really good. The food is prepared hygienically & Its always fresh . Its a must try for all the people living in shillong. My favourite from her menu is strawberry panacotta and cheesecake.The customised cakes are made to perfection. So intricate and detailed designing. Every cake is a piece of art. You just cant miss it. Waiting to order something new soon. Best wishes to Savor by Dee. Thanks you for exceptional service.",
    item_name: null,
    rating: null,
  },
  {
    author_name: "Jonathan Benjamin",
    body: "The New York Cheesecake (Blueberry) was very good. And I say this as someone who bakes his own cheesecakes. The levels of sugar & acidity were spot on & the cheese & sour cream was very well balanced. Thank you & best wishes!",
    item_name: "New York Baked Cheesecake: Blueberry",
    rating: null,
  },
  {
    author_name: GOOGLE,
    body: "Savour by Dee offers really good cakes and biscuits, made with care and great attention to quality. You can tell time and effort go into the preparation rather than rushing the process. What stands out even more is the personal touch—the owner herself ensures delivery, which adds a lot of trust and warmth to the experience. Highly recommended for anyone who values homemade quality and sincerity.",
    item_name: null,
    // "Food: 5/5 | Service: 5/5 | Atmosphere: 5/5" is on the screenshot.
    rating: 5,
  },
  {
    author_name: SWIGGY,
    body: "The korean buns are now my new favourite thing !! crazy delicious!",
    item_name: "Korean Buns",
    rating: null,
  },
  {
    author_name: GOOGLE,
    body: "One of the best bakeries in Shillong. Their nutty truffle is my favourite. 😋",
    item_name: "Nutty Chocolate Truffle",
    rating: null,
  },
  {
    author_name: GOOGLE,
    body: 'I ordered Banana walnut cake it was "Just devoured the most delicious cake! Moist, flavorful, and absolutely perfect! Highly recommend! 🎂👌 5/5 stars!"',
    item_name: "Banana & Walnut",
    rating: 5,
  },
  {
    author_name: GOOGLE,
    body: "🍰 One of the best bakery in town for ordering delectable cakes. 👍💯 Freshly baked and savory items to melt in the mouth. 💖 Looking forward to further ordering.",
    item_name: null,
    rating: null,
  },
  {
    author_name: SWIGGY,
    body: "2nd time ordering from Savor By Dee! Worth every penny 🤩",
    item_name: null,
    rating: null,
  },
  {
    author_name: GOOGLE,
    body: "I really loved the cinnamon roll, and lamington desserts. Thank you!",
    item_name: "Cinnamon Roll, Lamingtons",
    rating: null,
  },
  {
    author_name: GOOGLE,
    body: "The best cakes and pastries i have had in a long time Cannot wait to get back to shillong to sink my teeth into them Yummy 😋😋😋",
    item_name: null,
    rating: null,
  },
  {
    author_name: GOOGLE,
    body: "Savor by Dee the best bakery/cake shop in town. For all your bakery needs, Savor by Dee is the place to go to. Super delicious cakes, savouries, pastries for all occasions",
    item_name: null,
    rating: null,
  },
  {
    author_name: GOOGLE,
    body: "The staff are very friendly and the food is just as good! The do have sitting accommodations but more of a take away kind of place. Cozy and warm for dates",
    item_name: null,
    rating: null,
  },
  {
    author_name: GOOGLE,
    body: "So far i have ordered multiple times from this establishment. They are yet to disappoint.",
    item_name: null,
    rating: null,
  },
  {
    author_name: GOOGLE,
    body: "Piece of HEAVEN on earth ❤️",
    item_name: null,
    rating: null,
  },
  {
    author_name: GOOGLE,
    body: "loved their cake",
    item_name: null,
    rating: null,
  },
];

async function main() {
  const supabase = createAdminClient();
  const dry = process.argv.includes("--dry");

  if (process.argv.includes("--remove")) {
    const { error, count } = await supabase
      .from("reviews")
      .delete({ count: "exact" })
      .in("author_name", SOURCES);
    if (error) throw new Error(error.message);
    console.log(`Removed ${count ?? 0} imported review(s).`);
    return;
  }

  for (const [i, r] of REVIEWS.entries()) {
    const stars = r.rating == null ? "no stars" : `${r.rating}★`;
    console.log(`  ${String(i + 1).padStart(2)}. ${r.author_name.padEnd(18)} ${stars.padEnd(8)} ${r.body.slice(0, 60)}`);
  }
  if (dry) {
    console.log("\n  DRY RUN, nothing written.");
    return;
  }

  // The placeholders were only ever there to show the layout. Idempotent on
  // the imported rows too, so a second run does not stack duplicates.
  const { error: delError } = await supabase
    .from("reviews")
    .delete()
    .in("author_name", ["Placeholder", ...SOURCES]);
  if (delError) throw new Error(delError.message);

  const { data, error } = await supabase
    .from("reviews")
    .insert(REVIEWS.map((r, i) => ({ ...r, sort_order: i + 1, is_active: true })))
    .select("id");
  if (error) throw new Error(error.message);

  console.log(`\nInserted ${data?.length ?? 0} review(s); placeholders removed.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
