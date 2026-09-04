import { notFound, permanentRedirect } from "next/navigation";
import {
  Truck,
  ShieldCheck,
  PackageCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MenuTypeGrid } from "@/components/menu/menu-type-grid";
import { MenuPageNav } from "@/components/menu/menu-page-nav";
import { MenuFeatureTiles, type FeatureTile } from "@/components/home/menu-feature-tiles";
import { MenuTypeTabs } from "@/components/home/menu-type-tabs";

export const dynamic = "force-dynamic"; // see app/page.tsx — ISR hangs on memoryQueue

const SELECT_FIELDS =
  "id, name, description, base_price_cents, price_model, dietary_tags, image_url, is_sold_out, category_id, price_options, addons, variants, decoration_tiers, size_options, min_order_qty, stock_count, requires_custom_notice, daily_menu, is_special, is_bestseller";

/**
 * One page per curated menu, at /menu/daily, /menu/preorder and /menu/specials.
 *
 * A single dynamic route rather than three near-identical files: the only
 * things that actually differ are the flag column, the copy and the three
 * feature tiles, so they live in the table below.
 *
 * `column` names the boolean on menu_items. is_preorder arrives with migration
 * 00018 — before that is applied the preorder query errors, `data` is null, and
 * the page renders its empty state rather than throwing.
 */
const MENUS: Record<
  string,
  { label: string; column?: string; blurb: string; empty: string; tiles: FeatureTile[] }
> = {
  daily: {
    label: "Daily Menu",
    column: "daily_menu",
    blurb:
      "What is going into the oven today. The list changes daily, so this is the one worth checking before you order.",
    empty: "Today's list is not up yet. Check back shortly.",
    // Two-word label over a one-word second line, which is the shape Little
    // Token's trust strip uses and the reason three fit across a phone.
    tiles: [
      { icon: Truck, label: "Same Day", sub: "Delivery" },
      { icon: ShieldCheck, label: "Freshness", sub: "Guaranteed" },
      { icon: PackageCheck, label: "In-Stock", sub: "Goodies" },
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (type === "preorder") return { title: "Preorder Menu – Savor by Dee" };
  const menu = MENUS[type];
  if (!menu) return { title: "Menu – Savor by Dee" };
  return { title: `${menu.label} – Savor by Dee`, description: menu.blurb };
}

export default async function MenuTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  // The preorder menu is the full menu, and it lives at /menu. This route is
  // kept only so existing links and bookmarks do not 404.
  if (type === "preorder") permanentRedirect("/menu");

  const menu = MENUS[type];
  if (!menu) notFound();

  const supabase = await createClient();
  // A menu with no `column` is the full catalogue, so the flag filter is
  // skipped rather than passed an undefined column name.
  const base = supabase
    .from("menu_items")
    .select(SELECT_FIELDS)
    .eq("is_active", true);
  const { data: items } = await (menu.column
    ? base.eq(menu.column, true)
    : base
  ).order("sort_order");

  return (
    <div className="bg-bk-bg">
      <div className="mx-auto w-full max-w-[var(--bk-page-width)] px-4 pb-16 pt-8 md:px-6 md:pt-12">
        <div className="mb-6">
          <MenuPageNav current={type} />
        </div>

        <h1 className="bk-section-title text-bk-fg">{menu.label}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bk-muted md:text-base">
          {menu.blurb}
        </p>

        {/* The tabs repeat here so switching menus never needs a trip back to
            the homepage. Current tab is derived from the route. */}
        <div className="mt-6">
          <MenuTypeTabs active={type} />
        </div>

        <div className="mt-6 md:mt-8">
          <MenuFeatureTiles tiles={menu.tiles} />
        </div>

        <div className="mt-8 md:mt-10">
          <MenuTypeGrid items={items ?? []} empty={menu.empty} />
        </div>

        {/* The "see the full menu instead" link is gone: the full menu is the
            preorder menu, and MenuPageNav at the top already offers it. */}
      </div>
    </div>
  );
}
