"use client";

import { useState } from "react";
import Link from "next/link";
import { ItemDetailModal } from "@/components/item-detail-modal";
import { ProductMiniCard } from "@/components/home/product-mini-card";
import type { MenuItemForCart } from "@/lib/cart/types";

/**
 * The item grid on a single menu-type page (/menu/daily, /menu/preorder, …).
 *
 * Two across on a phone, four on desktop — Little Token's 2-up widened rather
 * than a new grammar, so a card is the same object here as on the homepage.
 * One modal for the whole grid, not one per card.
 */
export function MenuTypeGrid({
  items,
  empty,
}: {
  items: MenuItemForCart[];
  empty: string;
}) {
  const [selected, setSelected] = useState<MenuItemForCart | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--bk-r-block)] border border-bk-border bg-bk-bg-3 px-6 py-14 text-center">
        <p className="text-sm text-bk-muted">{empty}</p>
        <Link
          href="/menu"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-[var(--bk-r-pill)] bg-bk-btn px-6 text-sm font-medium text-bk-btn-fg transition-opacity hover:opacity-85"
        >
          Browse the preorder menu
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {items.map((item) => (
          <ProductMiniCard
            key={item.id}
            item={item}
            onSelect={setSelected}
            sizes="(max-width: 768px) 45vw, 300px"
          />
        ))}
      </div>

      {selected && (
        <ItemDetailModal
          item={selected}
          open={selected !== null}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
