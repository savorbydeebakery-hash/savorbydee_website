import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  ShieldCheck,
  PackageCheck,
  CalendarClock,
  Cake,
  PartyPopper,
  Sparkles,
  Clock,
  Gift,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MenuTypeGrid } from "@/components/menu/menu-type-grid";
import { MenuFeatureTiles, type FeatureTile } from "@/components/home/menu-feature-tiles";
import { MenuTypeTabs } from "@/components/home/menu-type-tabs";

export const dynamic = "force-dynamic"; // see app/page.tsx — ISR hangs on memoryQueue

const SELECT_FIELDS =
  "id, name, description, base_price_cents, price_model, dietary_tags, image_url, is_sold_out, category_id, price_options, addons, variants, decoration_tiers, size_options, min_order_qty, requires_custom_notice, daily_menu, is_special, is_bestseller";

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
  { label: string; column: string; blurb: string; empty: string; tiles: FeatureTile[] }
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
  preorder: {
    label: "Preorder Menu",
    column: "is_preorder",
    blurb:
      "Reserve ahead for the bakes that need a little notice. Flagged in the admin panel, so this list is whatever Dee is taking orders for right now.",
    empty: "Nothing is open for preorder at the moment. Check back soon.",
    tiles: [
      {
        icon: CalendarClock,
        label: "Reserve in Advance",
        sub: "Secure your favourites early, available on a first-come, first-serve basis.",
      },
      {
        icon: Cake,
        label: "Custom Creations",
        sub: "Personalised cakes and themed treats made just for you.",
      },
      {
        icon: PartyPopper,
        label: "Perfect for Events",
        sub: "Plan ahead for birthdays, weddings, or gatherings with handcrafted indulgence.",
      },
    ],
  },
  specials: {
    label: "Specials",
    column: "is_special",
    blurb: "Seasonal bakes and limited runs. Here only while they last.",
    empty: "No specials running at the moment.",
    tiles: [
      { icon: Sparkles, label: "Seasonal", sub: "Only" },
      { icon: Clock, label: "Limited", sub: "Run" },
      { icon: Gift, label: "Gift", sub: "Ready" },
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
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
  const menu = MENUS[type];
  if (!menu) notFound();

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("menu_items")
    .select(SELECT_FIELDS)
    .eq("is_active", true)
    .eq(menu.column, true)
    .order("sort_order");

  return (
    <div className="bg-bk-bg">
      <div className="mx-auto w-full max-w-[var(--bk-page-width)] px-4 pb-16 pt-8 md:px-6 md:pt-12">
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

        <div className="mt-10 border-t border-bk-border pt-6">
          <Link
            href="/menu"
            className="text-sm font-medium text-bk-fg underline-offset-4 hover:underline"
          >
            See the full menu instead
          </Link>
        </div>
      </div>
    </div>
  );
}
