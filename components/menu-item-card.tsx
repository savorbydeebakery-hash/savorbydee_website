"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/kinetic/smart-image";
import { Lens } from "@/components/magicui/lens";
import { useTilt } from "@/lib/motion/use-tilt";
import type { MenuItemForCart } from "@/lib/cart/types";
import { useCanOrder } from "@/components/shop/shop-status";

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
  const hasImage = Boolean(item.image_url);
  // See product-mini-card: a tracked item at 0 is unavailable.
  const unavailable = item.is_sold_out || item.stock_count === 0;
  // See product-mini-card: shop-closed greys the card without claiming the
  // item itself is unavailable.
  const { canOrder } = useCanOrder(item);
  const blocked = unavailable || !canOrder;
  const tilt = useTilt<HTMLElement>(6);

  return (
    <article
      ref={tilt}
      className={`menu-item-card group flex h-full flex-col overflow-hidden rounded-[var(--r-lg)] border border-ink/8 bg-porcelain transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:border-berry/25 hover:shadow-[var(--shadow-lg)] motion-reduce:hover:translate-y-0 ${
        !canOrder ? "opacity-50 grayscale" : ""
      }`}
      data-item-id={item.id}
      data-item-name={item.name.toLowerCase()}
      data-orderable={canOrder ? "true" : "false"}
    >
      {/* Image area only when there IS an image. Most menu items have no
          photo (the client launched text-only), and unconditionally rendering
          a 4:5 box turned the menu into a wall of empty placeholders — the
          pre-Phase-6 cards were conditional and this restores that.
          4:5 portrait reads as more premium than 4:3 when a photo exists. */}
      {hasImage && (
        <div className="relative">
          {/* contain, not cover: these are phone photos with off-centre
              subjects and a hard crop was removing the cake. bg-shell gives the
              letterboxing a deliberate tint rather than bare white.
              Lens lets the customer look closer at the decoration, which on a
              cake menu is the thing they actually want to inspect. */}
          <Lens zoomFactor={1.7} lensSize={130} ariaLabel="Zoom into the photo">
          <SmartImage
            src={item.image_url}
            alt={item.name}
            aspect="aspect-[4/3]"
            sizes={sizes}
            fit="contain"
            className="rounded-none bg-shell"
          />
          </Lens>
          {/* Price as a glass chip over the image — glass over imagery is the
              placement rule's happy path. */}
          {!unavailable && (
            <span
              data-contrast-ground="cocoa"
              className="glass absolute bottom-3 right-3 rounded-full px-3 py-1 text-sm font-semibold text-white"
            >
              {price}
            </span>
          )}
          {unavailable && (
            <span className="absolute bottom-3 right-3 rounded-full bg-cocoa/90 px-3 py-1 text-xs font-semibold text-shell">
              Sold Out
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        {categoryName && (
          <p className="text-xs text-ink-soft">{categoryName}</p>
        )}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-snug text-ink">
            {item.name}
          </h3>
          {/* Without an image there is no glass chip, so the price goes here. */}
          {!hasImage && (
            <span
              className={
                unavailable
                  ? "whitespace-nowrap rounded-full bg-ink/8 px-2.5 py-0.5 text-xs font-semibold text-ink-soft"
                  : "whitespace-nowrap text-sm font-semibold text-berry"
              }
            >
              {unavailable ? "Sold Out" : price}
            </span>
          )}
        </div>
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
            variant={blocked ? "ghost" : "cocoa"}
            disabled={blocked}
            className="w-full"
            data-item-id={item.id}
            data-item-name={item.name}
            data-item-price={item.base_price_cents}
            onClick={() => onSelect(item)}
          >
            {blocked ? "Unavailable" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </article>
  );
}
