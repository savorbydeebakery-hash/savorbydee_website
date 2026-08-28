"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemDetailModal } from "@/components/item-detail-modal";
import { RevealGroup, RevealItem } from "@/components/kinetic/reveal";
import { SmartImage } from "@/components/kinetic/smart-image";
import type { MenuItemForCart } from "@/lib/cart/types";

interface MenuCategory {
  id: string;
  name: string;
}

interface CurationRowProps {
  title: string;
  subtitle: string;
  items: MenuItemForCart[];
  categories: MenuCategory[];
}

/**
 * Reusable homepage product row (Chef's Choice / Most Ordered).
 * Cards show image, name, price + Add to Cart via ItemDetailModal.
 * Hides entirely when no items are flagged.
 */
export function CurationRow({ title, subtitle, items, categories }: CurationRowProps) {
  const [selectedItem, setSelectedItem] = useState<MenuItemForCart | null>(null);

  if (!items || items.length === 0) return null;

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink">{title}</h2>
          <p className="text-sm text-ink-soft mt-1">{subtitle}</p>
        </div>
        <Link
          href={title === "Most Ordered" ? "/menu?tag=bestseller" : "/menu?tag=chefs-choice"}
          className="inline-flex items-center gap-1 text-sm font-medium text-pink hover:gap-2 transition-all whitespace-nowrap"
        >
          View all <ArrowRight size={16} />
        </Link>
      </div>

      <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <RevealItem key={item.id}>
            <Card hover className="flex flex-col gap-3">
              {item.image_url && (
                <SmartImage src={item.image_url} alt={item.name} />
              )}
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-ink">{item.name}</h3>
                  {item.is_sold_out ? (
                    <Badge color="neutral">Sold Out</Badge>
                  ) : (
                    <span className="whitespace-nowrap text-sm font-semibold text-gold-deep">
                      ₹{(item.base_price_cents / 100).toFixed(0)}+
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-soft">{categoryName(item.category_id)}</p>
                {item.description && (
                  <p className="line-clamp-2 text-sm text-ink-soft">
                    {item.description}
                  </p>
                )}
                <div className="mt-auto pt-2">
                  <Button
                    size="sm"
                    variant={item.is_sold_out ? "ghost" : "primary"}
                    disabled={item.is_sold_out}
                    className="w-full"
                    onClick={() => setSelectedItem(item)}
                  >
                    {item.is_sold_out ? "Unavailable" : "Add to Cart"}
                  </Button>
                </div>
              </div>
            </Card>
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