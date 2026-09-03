"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
 * (Daily) and the Daily tab is marked current. The row is a preview; the tabs
 * above it are the way through to the full list, which is why the separate
 * "View the Daily Menu" button that used to sit under the row was removed —
 * it was a second control doing what the Daily tab already does.
 *
 * This replaced the old Daily | Specials split. Keeping both would have put
 * two competing menu-pickers on one page.
 */
export function MenuTypeShowcase({
  items,
  active = "daily",
}: {
  items: MenuItemForCart[];
  active?: string;
}) {
  const [selected, setSelected] = useState<MenuItemForCart | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Two full rows on desktop before the fold. The row used to show four and
  // stop, which made a 45-item daily menu look like a four-item one.
  const PREVIEW_COUNT = 8;
  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const hiddenCount = items.length - PREVIEW_COUNT;

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
            {visible.map((item, i) => (
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


        {hiddenCount > 0 && (
          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="glass-pill inline-flex h-12 items-center gap-2 px-7 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg focus-visible:ring-offset-2"
            >
              {expanded ? "Show fewer" : `View ${hiddenCount} more`}
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={`transition-transform duration-300 motion-reduce:transition-none ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        )}
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
