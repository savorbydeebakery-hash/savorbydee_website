"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ItemDetailModal } from "@/components/item-detail-modal";
import { RevealGroup, RevealItem } from "@/components/kinetic/reveal";
import type { MenuItemForCart } from "@/lib/cart/types";

interface MenuCategory {
  id: string;
  name: string;
}

interface DailyMenuProps {
  items: MenuItemForCart[];
  categories: MenuCategory[];
}

export function DailyMenu({ items, categories }: DailyMenuProps) {
  const [selectedItem, setSelectedItem] = useState<MenuItemForCart | null>(null);

  if (!items || items.length === 0) return null;

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Badge color="pink" className="mb-2">Fresh to Order</Badge>
          <h2 className="text-h2 text-ink">Today&apos;s Menu</h2>
        </div>
        <Link
          href="/menu"
          className="inline-flex items-center gap-1 text-sm font-medium text-berry hover:gap-2 transition-all"
        >
          View all <ArrowRight size={16} />
        </Link>
      </div>

      {/* Deliberately NOT the image-card grid used by "Most Ordered" just
          above. Three consecutive identical grids is the templated rhythm the
          redesign is undoing, and a daily list reads better as a list anyway:
          scannable, price-forward, no photo needed to decide. */}
      <RevealGroup className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
        {items.map((item) => (
          <RevealItem key={item.id}>
            <button
              type="button"
              onClick={() => setSelectedItem(item)}
              disabled={item.is_sold_out}
              data-item-id={item.id}
              data-item-name={item.name}
              data-item-price={item.base_price_cents}
              className="group flex w-full items-baseline gap-3 border-b border-ink/10 py-4 text-left transition-colors hover:border-berry/40 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {/* min-w-0 + wrapping, NOT flex-shrink-0: names like "Cupcakes,
                  Muffins & Brownies" overflowed 375px viewports by 55px when
                  this span refused to shrink. */}
              <span className="min-w-0 flex-1">
                <span className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-berry">
                  {item.name}
                </span>
                {categoryName(item.category_id) && (
                  <span className="ml-2 text-xs text-ink-soft">
                    {categoryName(item.category_id)}
                  </span>
                )}
              </span>
              {/* Leader dots, the way a printed menu sets a price. Desktop
                  only: there is no spare width for them on a phone. */}
              <span
                aria-hidden="true"
                className="mx-1 hidden h-px flex-1 translate-y-[-0.2em] border-b border-dotted border-ink/25 sm:block"
              />
              <span className="flex-shrink-0 text-sm font-semibold text-berry">
                {item.is_sold_out
                  ? "Sold out"
                  : `₹${(item.base_price_cents / 100).toFixed(0)}+`}
              </span>
            </button>
          </RevealItem>
        ))}
      </RevealGroup>

      <ItemDetailModal
        item={selectedItem}
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
      />
    </section>
  );
}