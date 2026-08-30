"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ItemDetailModal } from "@/components/item-detail-modal";
import { ProductMiniCard } from "@/components/home/product-mini-card";
import { MenuTypeTabs } from "@/components/home/menu-type-tabs";
import type { MenuItemForCart } from "@/lib/cart/types";

/**
 * Homepage menu section, built to Brooki's shape: the tab strip IS the
 * heading — there is no separate title above it — and a row of product cards
 * sits directly beneath.
 *
 * Their tabs swap the row in place. Here they navigate to a page instead,
 * which is how this was specified, so the row below shows the DEFAULT menu
 * (Daily) and the Daily tab is marked current. The row is a preview, and the
 * link at the end goes to the full list.
 *
 * This replaced the old Daily | Specials split. Keeping both would have put
 * two competing menu-pickers on one page.
 */
export function MenuTypeShowcase({
  items,
  href = "/menu/daily",
  active = "daily",
}: {
  items: MenuItemForCart[];
  href?: string;
  active?: string;
}) {
  const [selected, setSelected] = useState<MenuItemForCart | null>(null);

  return (
    <section className="mx-auto mt-10 w-full max-w-[var(--bk-page-width)] px-4 md:mt-16 md:px-6">
      <MenuTypeTabs active={active} />

      <div className="mt-5 md:mt-7">
        {items.length === 0 ? (
          <p className="rounded-[var(--bk-r-block)] border border-bk-border bg-bk-bg-3 px-6 py-10 text-center text-sm text-bk-muted">
            Today&rsquo;s list is not up yet. Check back shortly.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {items.slice(0, 4).map((item, i) => (
              <ProductMiniCard
                key={item.id}
                item={item}
                onSelect={setSelected}
                // Brooki flags the first card in the row. Only genuine
                // bestsellers get it — the flag is set per item in admin, so
                // this never invents a claim about what sells.
                badge={item.is_bestseller ? "Best Seller" : undefined}
                sizes="(max-width: 768px) 45vw, 300px"
                priority={i < 2}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-center">
        <Link
          href={href}
          className="inline-flex h-11 items-center gap-1.5 rounded-[var(--bk-r-pill)] bg-bk-btn px-7 text-sm font-medium text-bk-btn-fg transition-opacity hover:opacity-85"
        >
          View the Daily Menu <ChevronRight size={16} />
        </Link>
      </div>

      {selected && (
        <ItemDetailModal
          item={selected}
          open={selected !== null}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
