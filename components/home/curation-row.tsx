"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MenuItemCard } from "@/components/menu-item-card";
import { ItemDetailModal } from "@/components/item-detail-modal";
import { RevealGroup, RevealItem } from "@/components/kinetic/reveal";
import type { MenuItemForCart } from "@/lib/cart/types";

interface MenuCategory {
  id: string;
  name: string;
}

interface CurationRowProps {
  title: string;
  subtitle: string;
  /** Small uppercase kicker above the title. */
  eyebrow?: string;
  items: MenuItemForCart[];
  categories: MenuCategory[];
}

/**
 * Reusable homepage product row (Chef's Choice / Most Ordered).
 * Cards show image, name, price + Add to Cart via ItemDetailModal.
 * Hides entirely when no items are flagged.
 */
export function CurationRow({
  title,
  subtitle,
  eyebrow,
  items,
  categories,
}: CurationRowProps) {
  const [selectedItem, setSelectedItem] = useState<MenuItemForCart | null>(null);

  if (!items || items.length === 0) return null;

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          {eyebrow && (
            <p className="text-eyebrow mb-2 text-berry">{eyebrow}</p>
          )}
          <h2 className="text-h2 text-ink">{title}</h2>
          <p className="text-sm text-ink-soft mt-2 max-w-md">{subtitle}</p>
        </div>
        <Link
          href={title === "Most Ordered" ? "/menu?tag=bestseller" : "/menu?tag=chefs-choice"}
          className="inline-flex items-center gap-1 text-sm font-medium text-berry hover:gap-2 transition-all whitespace-nowrap"
        >
          View all <ArrowRight size={16} />
        </Link>
      </div>

      <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <RevealItem key={item.id} className="h-full">
            <MenuItemCard
              item={item}
              categoryName={categoryName(item.category_id)}
              onSelect={setSelectedItem}
            />
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