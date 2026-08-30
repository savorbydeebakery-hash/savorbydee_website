import { createClient } from "@/lib/supabase/server";
import { PromoBanner } from "@/components/promo-banner";
import { HeroCard } from "@/components/ui/hero-card";
import { GalleryRail } from "@/components/home/gallery-rail";
import { MenuTypeShowcase } from "@/components/home/menu-type-showcase";
import { CatalogueSplit } from "@/components/home/catalogue-split";
import { ReviewsCarousel } from "@/components/home/reviews-carousel";
import { BestSellers } from "@/components/home/best-sellers";
import { BehindTheScenes } from "@/components/home/behind-the-scenes";

// NOTE: this was briefly `export const revalidate = 60` to avoid Supabase
// round-trips to Tokyo per request. That engages OpenNext's ISR path, which
// dispatches background revalidation through the configured queue — and
// open-next.config.ts uses `memoryQueue`, which revalidates inside the same
// worker invocation. The result was:
//
//   Uncaught Error: The Workers runtime canceled this request because it
//   detected that your Worker's code had hung and would never generate a
//   response.
//
// The shell returned 200 but the RSC stream never resolved, so the page
// rendered as a permanent loading skeleton. Reverted until a real queue
// (Cloudflare Queues) is wired up — see REDESIGN_PLAN.md "Deferred".
export const dynamic = "force-dynamic";

/**
 * Homepage, rebuilt against two references:
 *
 *   Little Token (littletoken.in) — layout and rhythm. Sections are separated
 *   by margin alone (24px phone / 56px desktop), each opens with a bold title
 *   and a quiet "See All", rails run full-bleed past the gutter, and product
 *   tiles carry no card chrome. Note that site never leaves a 448px column
 *   even on a desktop monitor; the brief here is "Little Token on mobile,
 *   optimised for desktop", so the vocabulary is kept and the container is
 *   allowed to grow to Brooki's 1410px with the splits going 50/50 at `lg`.
 *
 *   Brooki (brookibakehouse.com) — palette, type and the phone bottom bar.
 *   White ground, true black type, DM Sans throughout, pill buttons, 20px
 *   block radii. Tokens live in globals.css under "Brooki layer".
 *
 * Section order is fixed by the brief: Hero, Gallery, then two 50/50 rows.
 * Everything that used to sit between them — Chef's Choice, Most Ordered, the
 * scroll-scrubbed video sections, the marquee, Best Bakery, the custom-cake
 * band and the three-step list — is gone from this page. Those components are
 * all still in the tree and still used elsewhere or available to re-add.
 */
export default async function HomePage() {
  const supabase = await createClient();

  const SELECT_FIELDS =
    "id, name, description, base_price_cents, price_model, dietary_tags, image_url, is_sold_out, category_id, price_options, addons, variants, decoration_tiers, size_options, min_order_qty, requires_custom_notice, daily_menu, is_special, is_bestseller";

  const [
    { data: dailyItems },
    { data: categories },
    { data: galleryPhotos },
    { count: itemCount },
    { data: settings },
    { data: reviews },
    { data: bestsellers },
    { data: bts },
  ] = await Promise.all([
    supabase
      .from("menu_items")
      .select(SELECT_FIELDS)
      .eq("is_active", true)
      .eq("daily_menu", true)
      .order("sort_order")
      .limit(4),
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("gallery_photos")
      .select("id, image_url, caption")
      .eq("is_active", true)
      .order("sort_order")
      .limit(14),
    // head:true — we want the number, not the rows.
    supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("site_settings").select("*").eq("id", 1).single(),
    // Reviews arrive with migration 00017. Until that is applied to a given
    // environment this errors and `data` comes back null, which collapses to
    // [] below and hides the section — so shipping the page ahead of the
    // migration degrades quietly instead of throwing.
    supabase
      .from("reviews")
      .select("id, author_name, body, item_name, rating")
      .eq("is_active", true)
      .order("sort_order")
      .limit(12),
    supabase
      .from("menu_items")
      .select(SELECT_FIELDS)
      .eq("is_active", true)
      .eq("is_bestseller", true)
      .order("sort_order")
      .limit(10),
    // behind_the_scenes arrives with migration 00019. Same degradation as
    // reviews: the query errors before it is applied, data is null, and the
    // section returns null rather than throwing.
    supabase
      .from("behind_the_scenes")
      .select("id, label, caption, image_url")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const photos = galleryPhotos ?? [];

  return (
    <div className="bg-bk-bg">
      <PromoBanner position="homepage_hero" />

      {/* 1. Hero — unchanged from the existing build, minus the proof badges. */}
      <HeroCard />

      {/* 2. Testimonials, directly under the hero. Still hides itself entirely
             while the reviews table is empty. */}
      <ReviewsCarousel
        reviews={reviews ?? []}
        title="Indulgence Approved"
        rating={4.6}
      />

      {/* 3. Menu types, in Brooki's shape: the tab strip is the heading and
             the cards sit straight under it. Selecting a tab opens that
             menu's own page. This replaced the Daily | Specials split — two
             menu-pickers on one page was one too many. */}
      <MenuTypeShowcase items={dailyItems ?? []} />

      {/* 4. Full Menu | Custom Order */}
      <CatalogueSplit
        categories={categories ?? []}
        itemCount={itemCount ?? 0}
        noticeDays={settings?.custom_cake_notice_days ?? 5}
      />

      {/* 5. Gallery — moved below the menu so the page leads with what is for
             sale and follows with what it looks like. */}
      <GalleryRail photos={photos} />

      {/* 6. Best Sellers — a scrolling rail, hidden when nothing is flagged. */}
      <BestSellers items={bestsellers ?? []} />

      {/* 7. Behind the Scenes — hidden until the photos exist. */}
      <BehindTheScenes items={bts ?? []} />
    </div>
  );
}
