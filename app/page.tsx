import { createClient } from "@/lib/supabase/server";
import { PromoBanner } from "@/components/promo-banner";
import { HeroCard } from "@/components/ui/hero-card";
import { GalleryRail } from "@/components/home/gallery-rail";
import { MenuSplit } from "@/components/home/menu-split";
import { CatalogueSplit } from "@/components/home/catalogue-split";
import { ReviewsCarousel } from "@/components/home/reviews-carousel";

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
    { data: specialItems },
    { data: categories },
    { data: galleryPhotos },
    { count: itemCount },
    { data: settings },
    { data: reviews },
  ] = await Promise.all([
    supabase
      .from("menu_items")
      .select(SELECT_FIELDS)
      .eq("is_active", true)
      .eq("daily_menu", true)
      .order("sort_order")
      .limit(4),
    // This used to select only `id` because the page just needed to know
    // whether any specials existed. The Specials panel renders them now, so
    // it needs the full row.
    supabase
      .from("menu_items")
      .select(SELECT_FIELDS)
      .eq("is_active", true)
      .eq("is_special", true)
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
  ]);

  const photos = galleryPhotos ?? [];

  return (
    <div className="bg-bk-bg">
      <PromoBanner position="homepage_hero" />

      {/* 1. Hero — unchanged from the existing build, minus the proof badges. */}
      <HeroCard />

      {/* 2. Gallery */}
      <GalleryRail photos={photos} />

      {/* 3. Daily | Specials */}
      <MenuSplit
        left={{
          title: "Daily Menu",
          blurb:
            "What is going into the oven today. The list changes, so this is the one worth checking.",
          href: "/menu?tag=daily",
          items: dailyItems ?? [],
          empty: "Today's list is not up yet. Check back shortly.",
        }}
        right={{
          title: "Specials",
          blurb:
            "Seasonal bakes and limited runs. Here only while they last.",
          href: "/menu?tag=specials",
          items: specialItems ?? [],
          empty: "No specials running at the moment.",
          tinted: true,
        }}
      />

      {/* 4. Full Menu | Custom Order */}
      <CatalogueSplit
        categories={categories ?? []}
        itemCount={itemCount ?? 0}
        noticeDays={settings?.custom_cake_notice_days ?? 5}
      />

      {/* 5. Reviews. Appended after the four sections the brief numbered, so
             that order is untouched. Hides itself when there are none. */}
      <ReviewsCarousel reviews={reviews ?? []} />
    </div>
  );
}
