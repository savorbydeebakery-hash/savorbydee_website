import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { MenuClient } from "@/components/menu-client";

export const metadata = {
  title: "Menu – Savor by Dee",
  description:
    "Browse our full menu of cakes, desserts, cookies, and savoury bakes. Pre-order online with 12 hours notice.",
};

export const revalidate = 60;

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
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <Badge color="pink" className="mb-3">Fresh to Order</Badge>
        <h1 className="text-4xl font-bold text-ink mb-3">Our Menu</h1>
        <p className="text-ink-soft max-w-xl mx-auto">
          Every item is made fresh when you order. Please allow at least 12 hours
          for standard items.
        </p>
      </div>

      <MenuClient
        categories={categories ?? []}
        menuItems={menuItems ?? []}
        tag={tag}
      />
    </div>
  );
}