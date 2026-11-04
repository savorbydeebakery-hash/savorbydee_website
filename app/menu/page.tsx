import { publicSupabase, getSiteSettings } from "@/lib/site/public-data";
import Link from "next/link";
import { JsonLd } from "@/components/site/json-ld";
import { toPreorderListing } from "@/lib/menu/preorder-listing";
import { categoryPath, menuSchema, pageMeta } from "@/lib/site/seo";
import { MenuClient } from "@/components/menu-client";
import { MenuPageNav } from "@/components/menu/menu-page-nav";
import { PropField } from "@/components/props/prop-field";
import { Macaron, Cherry, Sprinkles } from "@/components/props/pastry-props";
import { applyDerivedWeights } from "@/lib/menu/weight-tiers";
import { applyPhotoRule, showPreorderPhotos } from "@/lib/menu/photos";
import { PromoBanner } from "@/components/promo-banner";

export const metadata = pageMeta({
  title: "Preorder Menu: Cakes & Bakes in Shillong",
  description:
    "Preorder cakes, cheesecakes, cupcakes, cookies, desserts and high tea nibbles from Savor by Dee in Shillong. Made fresh to order, for pickup or delivery.",
  path: "/menu",
});

export const dynamic = "force-dynamic"; // see app/page.tsx — ISR hangs on memoryQueue

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; category?: string }>;
}) {
  const supabase = publicSupabase();
  const { tag, category } = await searchParams;

  const [{ data: categories }, { data: menuItems }, { data: settings }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, name, description, base_price_cents, price_model, dietary_tags, image_url, is_sold_out, category_id, price_options, addons, variants, decoration_tiers, size_options, min_order_qty, stock_count, notice_hours, bulk_threshold, categories(notice_hours, bulk_threshold, weight_multipliers), requires_custom_notice, daily_menu, is_special, is_chefs_choice, is_bestseller"
      )
      .eq("is_active", true)
      // Items ticked "On Preorder Menu". An item can be on both menus
      // (client, 2026-11-01: cookies are baked for the day and preordered in
      // boxes); categories with nothing on this menu are dropped below.
      .eq("preorder_menu", true)
      .order("sort_order"),
    // So the stated wait tracks the admin setting instead of going stale.
    getSiteSettings().then((data) => ({ data })),
  ]);

  // Only offer a category chip for a category that still has something in it.
  // MenuClient hides empty SECTIONS on its own, but renders a chip for every
  // category handed to it, so without this the daily-only categories would
  // show as chips that filter down to nothing.
  const preorderItems = toPreorderListing(menuItems);
  const usedCategoryIds = new Set(preorderItems.map((i) => i.category_id));
  const preorderCategories = (categories ?? []).filter((c) => usedCategoryIds.has(c.id));
  const listed = applyDerivedWeights(applyPhotoRule(preorderItems, showPreorderPhotos(settings)));

  return (
    <div>
      <JsonLd data={menuSchema("Preorder Menu", "/menu", preorderCategories, listed)} />
      {/* Compact dark hero band — gives the menu page a top edge instead of
          starting cold on cream, and matches the homepage rhythm. */}
      <section data-contrast-ground="cocoa" className="relative overflow-hidden bg-cocoa px-4 py-10 sm:px-6 sm:py-20">
        <div
          aria-hidden="true"
          className="hero-mesh pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(55% 70% at 20% 25%, color-mix(in oklab, var(--berry) 50%, transparent), transparent 62%)," +
              "radial-gradient(50% 60% at 80% 30%, rgb(247 216 204 / 0.25), transparent 62%)," +
              "radial-gradient(70% 60% at 50% 100%, rgb(74 56 48 / 0.55), transparent 72%)",
          }}
        />
        <div aria-hidden="true" className="hero-grain absolute inset-0" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-eyebrow mb-3 text-blush">Fresh to order</p>
          <h1 className="text-h1 text-shell">Preorder Menu</h1>
          <p className="mx-auto mt-4 max-w-xl text-[#D8CCC0]">
            Every item is made fresh when you order. Please allow at least{" "}
            {settings?.preorder_notice_hours ?? 24} hours. Sundays don&rsquo;t count, so an order placed
            on a Sunday is ready from Tuesday. Custom cakes need up to{" "}
            {settings?.custom_cake_notice_days ?? 5} days.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
        <MenuPageNav />
      </div>

      {/* Admin -> Promo Banners -> "Menu Top". Rendered nowhere until now. */}
      <PromoBanner position="menu_top" />

      <PropField className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-12">
        <Macaron size={68} x="-2%" y="6%" depth={0.5} className="hidden xl:block" />
        <Sprinkles size={120} x="94%" y="22%" depth={0.7} className="hidden xl:block" />
        <Cherry size={40} x="-1%" y="62%" depth={0.35} className="hidden xl:block" />
        <MenuClient
          categories={preorderCategories}
          menuItems={listed}
          tag={tag}
          initialCategory={category}
        />
      </PropField>

      {/* The chips above only move around this page. These go to each category's
          own page, which is what Google can find for a search. */}
      <nav aria-label="Browse by category" className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <h2 className="text-sm font-semibold text-ink">Browse by category</h2>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
          {preorderCategories.map((c) => (
            <li key={c.id}>
              <Link href={categoryPath(c.name)} prefetch={false} className="underline underline-offset-4 hover:text-ink">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}