"use client";

import { useState } from "react";
import { ItemDetailModal } from "@/components/item-detail-modal";
import { ProductMiniCard } from "@/components/home/product-mini-card";
import { SectionHead } from "@/components/home/section-head";
import type { MenuItemForCart } from "@/lib/cart/types";

/**
 * Best Sellers, in Brooki's shape: a heading with a "See All", then cards on a
 * horizontally scrolling rail rather than a wrapping grid.
 *
 * The rail runs full-bleed past the page gutter on phones (-mx-4 with matching
 * padding) so a card is clipped at the right edge. That clipped card is the
 * affordance — it is what tells you the row scrolls, without needing arrows.
 *
 * Cards carry the Best Seller badge because these items are flagged
 * is_bestseller in the admin panel. It reports what the data says rather than
 * decorating every card with a sales claim.
 *
 * Every one of these currently has no photograph, so they fall back to the
 * typographic tile ProductMiniCard already uses. That was the deliberate
 * choice over borrowing a gallery photo: the gallery is finished-product
 * shots of other bakes, and putting one on a card named something else tells
 * the customer they are buying a thing they are not.
 */
export function BestSellers({ items }: { items: MenuItemForCart[] }) {
  const [selected, setSelected] = useState<MenuItemForCart | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <section className="mt-10 md:mt-16">
      <div className="mx-auto w-full max-w-[var(--bk-page-width)] px-4 md:px-6">
        <SectionHead title="Best Sellers" href="/menu" />
      </div>

      {/* The outer wrapper clips, exactly as GalleryRail does. An earlier
          version relied on the <ul>'s own overflow-x-auto and no wrapper, and
          that widened the DOCUMENT by 183px at 375px and 84px at 768px even
          though every element in the chain measured 375px wide and nothing
          escaped visually. Neither overflow-x:hidden nor overflow-x:clip on
          any ancestor fixed it, and nor did dropping scroll-snap — only
          removing the section did. Card widths are fixed rather than 45vw,
          since viewport units in a scroll container were making the overflow
          scale with the card size. */}
      <div className="relative mx-auto w-full max-w-[var(--bk-page-width)] overflow-hidden">
        <ul className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:gap-5 md:px-6">
          {items.map((item) => (
            <li
              key={item.id}
              // Fixed width, or flex would shrink every card to fit and the
              // rail would stop scrolling.
              className="w-40 shrink-0 sm:w-56 md:w-64"
            >
              <ProductMiniCard
                item={item}
                onSelect={setSelected}
                badge="Best Seller"
                sizes="(max-width: 640px) 45vw, 256px"
              />
            </li>
          ))}
        </ul>
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
