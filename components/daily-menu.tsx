"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MenuItemCard } from "@/components/menu-item-card";
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