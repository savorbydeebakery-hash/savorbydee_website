import { createClient } from "@/lib/supabase/server";
import { MenuClient } from "@/components/menu-client";
import { PropField } from "@/components/props/prop-field";
import { Macaron, Cherry, Sprinkles } from "@/components/props/pastry-props";

export const metadata = {
  title: "Menu – Savor by Dee",
  description:
    "Browse our full menu of cakes, desserts, cookies, and savoury bakes. Pre-order online with 12 hours notice.",
};

export const dynamic = "force-dynamic"; // see app/page.tsx — ISR hangs on memoryQueue

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const supabase = await createClient();
  const { tag } = await searchParams;

  const [{ data: categories }, { data: menuItems }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, name, description, base_price_cents, price_model, dietary_tags, image_url, is_sold_out, category_id, price_options, addons, variants, decoration_tiers, size_options, min_order_qty, requires_custom_notice, daily_menu, is_special, is_chefs_choice, is_bestseller"
      )
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return (
    <div>
      {/* Compact dark hero band — gives the menu page a top edge instead of
          starting cold on cream, and matches the homepage rhythm. */}
      <section data-contrast-ground="cocoa" className="relative overflow-hidden bg-cocoa px-4 py-16 sm:px-6 sm:py-20">
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
          <h1 className="text-h1 text-shell">Our Menu</h1>
          <p className="mx-auto mt-4 max-w-xl text-[#D8CCC0]">
            Every item is made fresh when you order. Please allow at least 12
            hours for standard items.
          </p>
        </div>
      </section>

      <PropField className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Macaron size={68} x="-2%" y="6%" depth={0.5} className="hidden xl:block" />
        <Sprinkles size={120} x="94%" y="22%" depth={0.7} className="hidden xl:block" />
        <Cherry size={40} x="-1%" y="62%" depth={0.35} className="hidden xl:block" />
        <MenuClient
          categories={categories ?? []}
          menuItems={menuItems ?? []}
          tag={tag}
        />
      </PropField>
    </div>
  );
}