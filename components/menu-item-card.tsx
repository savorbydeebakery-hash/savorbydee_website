"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/kinetic/smart-image";
import type { MenuItemForCart } from "@/lib/cart/types";

/**
 * The one product card. Previously this markup was copy-pasted into
 * curation-row, daily-menu and menu-client, which is why the three drifted
 * apart — the whole point of the redesign is that everything reads as one
 * system, so there is now one component.
 *
 * E2E CONTRACT — do not remove, e2e/*.spec.ts selects on all of these:
 *   .menu-item-card, data-item-id, data-item-name (lowercased) on the root
 *   data-item-id, data-item-name, data-item-price on the button
 *   button text "Add to Cart" / "Unavailable"
 */

const dietaryColors: Record<string, "mint" | "lavender" | "sky" | "yellow"> = {
  egg: "yellow",
  eggless: "mint",
  vegan: "lavender",
  "gluten-free": "sky",
  "sugar-free": "lavender",
  "nut-free": "sky",
};

export function MenuItemCard({
  item,
  categoryName,
  onSelect,
  showDietaryTags = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 368px",
}: {
  item: MenuItemForCart;
  categoryName?: string;
  onSelect: (item: MenuItemForCart) => void;
  showDietaryTags?: boolean;
  sizes?: string;
}) {
  const price = `₹${(item.base_price_cents / 100).toFixed(0)}+`;

  return (
    <article
      className="menu-item-card group flex h-full flex-col overflow-hidden rounded-[var(--r-lg)] border border-ink/8 bg-porcelain transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:border-berry/25 hover:shadow-[var(--shadow-lg)] motion-reduce:hover:translate-y-0"
      data-item-id={item.id}
      data-item-name={item.name.toLowerCase()}
    >
      {/* 4:5 portrait crop — taller cards read as more premium than 4:3, and
          it matches the editorial reference. */}
      <div className="relative">
        <SmartImage
          src={item.image_url}
          alt={item.name}
          aspect="aspect-[4/5]"
          sizes={sizes}
          className="rounded-none"
        />
        {/* Price as a glass chip over the image — glass over imagery is the
            placement rule's happy path. */}
        {!item.is_sold_out && (
          <span data-contrast-ground="cocoa" className="glass absolute bottom-3 right-3 rounded-full px-3 py-1 text-sm font-semibold text-white">
            {price}
          </span>
        )}
        {item.is_sold_out && (
          <span className="absolute bottom-3 right-3 rounded-full bg-cocoa/90 px-3 py-1 text-xs font-semibold text-shell">
            Sold Out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {categoryName && (
          <p className="text-eyebrow text-ink-soft">{categoryName}</p>
        )}
        <h3 className="font-display text-lg font-semibold leading-snug text-ink">
          {item.name}
        </h3>
        {item.description && (
          <p className="line-clamp-2 text-sm text-ink-soft">{item.description}</p>
        )}

        {showDietaryTags && item.dietary_tags && item.dietary_tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {item.dietary_tags.map((tag: string) => (
              <Badge key={tag} color={dietaryColors[tag.toLowerCase()] ?? "neutral"}>
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3">
          <Button
            size="sm"
            variant={item.is_sold_out ? "ghost" : "cocoa"}
            disabled={item.is_sold_out}
            className="w-full"
            data-item-id={item.id}
            data-item-name={item.name}
            data-item-price={item.base_price_cents}
            onClick={() => onSelect(item)}
          >
            {item.is_sold_out ? "Unavailable" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </article>
  );
}
