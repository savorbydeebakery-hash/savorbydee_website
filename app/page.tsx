import { createClient } from "@/lib/supabase/server";
import { PromoBanner } from "@/components/promo-banner";
import { HeroCard } from "@/components/ui/hero-card";
import { GalleryRail } from "@/components/home/gallery-rail";
import { MenuTypeCards } from "@/components/home/menu-type-cards";
import { CustomOrder } from "@/components/home/custom-order";
import { ReviewsCarousel } from "@/components/home/reviews-carousel";
import { BestSellers } from "@/components/home/best-sellers";
import { BehindTheScenes } from "@/components/home/behind-the-scenes";
import { AboutUs } from "@/components/home/about-us";
import { applyDerivedWeights } from "@/lib/menu/weight-tiers";
import {
  pickMenuPhoto,
  DAILY_MENU_PHOTO_KEYWORDS,
  PREORDER_MENU_PHOTO_KEYWORDS,
  CUSTOM_ORDER_PHOTO_KEYWORDS,
} from "@/lib/menu/menu-photo";

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
    "id, name, description, base_price_cents, price_model, dietary_tags, image_url, is_sold_out, category_id, price_options, addons, variants, decoration_tiers, size_options, min_order_qty, stock_count, notice_hours, bulk_threshold, categories(notice_hours, bulk_threshold, weight_multipliers), requires_custom_notice, daily_menu, is_special, is_bestseller";

  const [
    { data: galleryPhotos },
    { data: settings },
    { data: reviews },
    { data: bestsellers },
    { data: bts },
    { count: dailyTotal },
    { count: preorderTotal },
  ] = await Promise.all([
    supabase
      .from("gallery_photos")
      .select("id, image_url, caption")
      .eq("is_active", true)
      .order("sort_order")
      // 14 feeds the rail; the rest are here so the menu-card fallback has
      // something to match on. At 14 the window stopped just before the
      // cupcake shots, so the preorder card fell through to a cookie box.
      .limit(24),
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
      .limit(16),
    // behind_the_scenes arrives with migration 00019. Same degradation as
    // reviews: the query errors before it is applied, data is null, and the
    // section returns null rather than throwing.
    supabase
      .from("behind_the_scenes")
      .select("id, label, caption, image_url")
      .eq("is_active", true)
      .order("sort_order"),
    // Counts only — the menu cards say how many items each menu holds, and
    // nothing on this page lists them any more. An item belongs to exactly one
    // menu, so these two partition the catalogue rather than overlapping.
    supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("daily_menu", true),
    supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("daily_menu", false),
  ]);

  const photos = galleryPhotos ?? [];

  // Admin picks these; the fallback picks a gallery photo that at least
  // belongs to the menu it fronts. See lib/menu/menu-photo.ts for why "the
  // first photo in the gallery" is the wrong default.
  const menuCards = [
    {
      href: "/menu/daily",
      title: "Today's Menu",
      blurb: "Baked this morning. Ready in about two hours.",
      count: dailyTotal ?? undefined,
      imageUrl:
        settings?.daily_menu_image_url?.trim() ||
        pickMenuPhoto(photos, DAILY_MENU_PHOTO_KEYWORDS, 0),
    },
    {
      href: "/menu",
      title: "Preorder Menu",
      blurb: "Made to order. Please give us a day's notice.",
      count: preorderTotal ?? undefined,
      imageUrl:
        settings?.preorder_menu_image_url?.trim() ||
        pickMenuPhoto(photos, PREORDER_MENU_PHOTO_KEYWORDS, 1),
    },
  ];

  return (
    <div className="bg-bk-bg">
      <PromoBanner position="homepage_hero" />

      {/* 1. Hero — unchanged from the existing build, minus the proof badges. */}
      <HeroCard imageUrl={settings?.hero_image_url} />

      {/* 2. Testimonials, directly under the hero. Still hides itself entirely
             while the reviews table is empty. */}
      <ReviewsCarousel
        reviews={reviews ?? []}
        title="Indulgence Approved"
        rating={4.6}
      />

      {/* 3. The two menus, as two big photographs. This replaced a tab strip
             over eight item tiles: that block asked the visitor to pick a menu
             and pick an item in one glance, and on a phone the tiles pushed
             everything below them past the second screen. */}
      <MenuTypeCards cards={menuCards} />

      {/* 4. Best Sellers — a scrolling rail, hidden when nothing is flagged.
             Sits directly under the menu tabs on purpose: a customer who has
             just been shown the Daily and Preorder lists is at the point of
             choosing, and "what everyone else orders" is the most useful next
             thing to put in front of them. */}
      {/* Weights derived here too, not just on the menu pages: a bestselling
          sponge cake opened from this rail otherwise offered no kilo option,
          because the ladder is computed from the category rather than stored
          on the item. */}
      <BestSellers items={applyDerivedWeights(bestsellers)} />

      {/* 5. Custom Order */}
      <CustomOrder
        noticeDays={settings?.custom_cake_notice_days ?? 5}
        imageUrl={
          settings?.custom_order_image_url?.trim() ||
          pickMenuPhoto(photos, CUSTOM_ORDER_PHOTO_KEYWORDS, 2)
        }
      />

      {/* 6. Gallery — below the menu so the page leads with what is for
             sale and follows with what it looks like. */}
      <GalleryRail photos={photos.slice(0, 14)} />

      {/* 7. Behind the Scenes */}
      <BehindTheScenes items={bts ?? []} />

      {/* 8. About Us — carries the paragraph that used to sit under the hero
             headline, and is editable via site_settings.about_narrative. */}
      <AboutUs narrative={settings?.about_narrative} />
    </div>
  );
}
