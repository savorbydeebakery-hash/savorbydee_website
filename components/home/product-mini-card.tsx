"use client";

import { SmartImage } from "@/components/kinetic/smart-image";
import type { MenuItemForCart } from "@/lib/cart/types";

/**
 * Compact product card in Little Token's shape: portrait image with a 16px
 * radius, name on one line under it, price as "₹N onwards", and no card chrome
 * at all — no border, no shadow, no padding. The image IS the card.
 *
 * E2E CONTRACT — mirrored from components/menu-item-card.tsx, because
 * e2e/*.spec.ts selects on these and this card now stands in for that one on
 * the homepage:
 *   .menu-item-card, data-item-id, data-item-name (lowercased) on the root
 *   data-item-id, data-item-name, data-item-price on the button
 *   button text "Add to Cart" / "Unavailable"
 *
 * The whole tile is the button here rather than a separate CTA at the bottom,
 * which is what keeps it as short as Little Token's. The accessible name is
 * spelled out so it does not read as just the price to a screen reader.
 */
export function ProductMiniCard({
  item,
  onSelect,
  sizes = "(max-width: 768px) 45vw, 220px",
  badge,
  priority = false,
}: {
  item: MenuItemForCart;
  onSelect: (item: MenuItemForCart) => void;
  sizes?: string;
  /** Corner flag, e.g. "Best Seller". Only pass this for a claim the data
   *  actually supports — it reads as a statement of fact to a customer. */
  badge?: string;
  priority?: boolean;
}) {
  const rupees = `₹${(item.base_price_cents / 100).toFixed(0)}`;

  // Most of this catalogue has no photography yet (the menu_items table ships
  // image_url null for nearly every row). Rendering the empty 3:4 frame with a
  // placeholder icon four times in a row reads as a broken page rather than as
  // a bakery that has not shot its menu, so an item without a photo gets a
  // typographic tile instead: same footprint, same rhythm, nothing missing.
  const hasPhoto = Boolean(item.image_url);

  return (
    <article
      className="menu-item-card group"
      data-item-id={item.id}
      data-item-name={item.name.toLowerCase()}
    >
      <button
        type="button"
        disabled={item.is_sold_out}
        onClick={() => onSelect(item)}
        data-item-id={item.id}
        data-item-name={item.name}
        data-item-price={item.base_price_cents}
        aria-label={`${item.name}, ${rupees} onwards. ${
          item.is_sold_out ? "Unavailable" : "Add to Cart"
        }`}
        className="block w-full rounded-[var(--bk-r-inner)] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg focus-visible:ring-offset-2 disabled:cursor-not-allowed"
      >
        <div className="relative overflow-hidden rounded-[var(--bk-r-inner)] bg-bk-bg-3">
          {hasPhoto ? (
            <SmartImage
              src={item.image_url}
              alt=""
              aspect="aspect-[3/4]"
              sizes={sizes}
              priority={priority}
              fit="cover"
              className="rounded-[var(--bk-r-inner)] bg-bk-bg-3 transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex aspect-[3/4] items-center justify-center rounded-[var(--bk-r-inner)] bg-bk-pink-soft p-4"
            >
              <span className="line-clamp-4 text-center text-base font-medium leading-snug tracking-tight text-bk-fg/80">
                {item.name}
              </span>
            </div>
          )}

          {badge && !item.is_sold_out && (
            <span className="absolute left-2 top-2 rounded-[var(--bk-r-sm)] bg-bk-maroon px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              {badge}
            </span>
          )}

          {item.is_sold_out && (
            <span className="absolute inset-x-0 bottom-0 bg-bk-fg/75 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-white">
              Sold Out
            </span>
          )}
        </div>

        <h3 className="mt-2 truncate text-sm font-medium text-bk-fg">
          {item.name}
        </h3>

        <p className="mt-0.5 text-sm text-bk-fg">
          <span className="font-semibold">{rupees}</span>{" "}
          <span className="text-xs text-bk-muted">onwards</span>
        </p>

        {/* The E2E suite asserts on this label. It is also the honest
            description of what activating the tile does — it opens the
            options sheet, which is where the item is actually added. */}
        <span className="sr-only">
          {item.is_sold_out ? "Unavailable" : "Add to Cart"}
        </span>
      </button>
    </article>
  );
}
