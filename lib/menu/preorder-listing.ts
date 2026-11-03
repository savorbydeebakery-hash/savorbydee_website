import { cache } from "react";
import { publicSupabase, getSiteSettings } from "@/lib/site/public-data";
import { categorySlug } from "@/lib/menu/category-slug";
import { applyDerivedWeights } from "@/lib/menu/weight-tiers";
import { applyPhotoRule, showPreorderPhotos } from "@/lib/menu/photos";
import type { MenuItemForCart } from "@/lib/cart/types";

/**
 * Here every item is a preorder, including one also on Today's Menu: the cart,
 * notice, dates, photos and weights all go by daily_menu. Today's Stock and Sold
 * Out are today's bakes, so they don't follow an item here from Today's Menu; the
 * order API applies the same rule.
 */
export function toPreorderListing<
  T extends { daily_menu?: boolean | null; is_sold_out?: boolean | null; stock_count?: number | null },
>(rows: T[] | null | undefined) {
  return (rows ?? []).map((i) => ({
    ...i,
    daily_menu: false,
    is_sold_out: i.daily_menu ? false : i.is_sold_out,
    stock_count: i.daily_menu ? null : i.stock_count,
  }));
}

const FIELDS =
  "id, name, description, base_price_cents, price_model, dietary_tags, image_url, is_sold_out, category_id, price_options, addons, variants, decoration_tiers, size_options, min_order_qty, stock_count, notice_hours, bulk_threshold, categories(notice_hours, bulk_threshold, weight_multipliers), requires_custom_notice, daily_menu, is_special, is_chefs_choice, is_bestseller";

/**
 * One Preorder Menu category and its items, for its own page. Null when there is
 * no such category, or nothing in it on this menu. Once per request: the page's
 * title and body both need it.
 */
export const getPreorderCategory = cache(async (slug: string) => {
  const supabase = publicSupabase();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  const category = (categories ?? []).find((c) => categorySlug(c.name) === slug);
  if (!category) return null;

  const [{ data: rows }, settings] = await Promise.all([
    supabase
      .from("menu_items")
      .select(FIELDS)
      .eq("is_active", true)
      .eq("preorder_menu", true)
      .eq("category_id", category.id)
      .order("sort_order"),
    getSiteSettings(),
  ]);
  if (!rows?.length) return null;

  const listed = toPreorderListing(rows as unknown as MenuItemForCart[]);
  return {
    category,
    settings,
    items: applyDerivedWeights(applyPhotoRule(listed, showPreorderPhotos(settings))) as MenuItemForCart[],
  };
});
