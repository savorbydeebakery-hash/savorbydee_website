"use client";

import { SmartImage } from "@/components/kinetic/smart-image";
import { useCanOrder } from "@/components/shop/shop-status";
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

  // This catalogue is text-only by design — the client is not shooting the
  // menu. An item without a photo used to get a pink typographic tile holding
  // its name, which put the name on screen twice and filled the grid with
  // large empty blocks of colour. No photo now means no image area at all, so
  // the card collapses to name and price and the rows sit close together.
  const hasPhoto = Boolean(item.image_url);

  // A tracked item at 0 is unavailable for the same reason a manually
  // sold-out one is. `!= null` rather than a truthy test, so an untracked
  // item (null) is never mistaken for an empty one.
  const unavailable = item.is_sold_out || item.stock_count === 0;

  // Outside business hours the card stays readable but goes flat and stops
  // responding — the delivery-app pattern the client asked for. Kept separate
  // from `unavailable` so the reasons do not blur: sold out is about the item,
  // closed is about the shop.
  const { canOrder } = useCanOrder(item);
  const blocked = unavailable || !canOrder;

  return (
    <article
      className={`menu-item-card group ${!canOrder ? "opacity-50 grayscale" : ""}`}
      data-item-id={item.id}
      data-item-name={item.name.toLowerCase()}
      data-orderable={canOrder ? "true" : "false"}
    >
      <button
        type="button"
        disabled={blocked}
        onClick={() => onSelect(item)}
        data-item-id={item.id}
        data-item-name={item.name}
        data-item-price={item.base_price_cents}
        aria-label={`${item.name}, ${rupees} onwards. ${
          blocked ? "Unavailable" : "Add to Cart"
        }`}
        className="block w-full rounded-[var(--bk-r-inner)] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg focus-visible:ring-offset-2 disabled:cursor-not-allowed"
      >
        {hasPhoto && (
          <div className="relative overflow-hidden rounded-[var(--bk-r-inner)] bg-bk-bg-3">
            <SmartImage
              src={item.image_url}
              alt=""
              aspect="aspect-[3/4]"
              sizes={sizes}
              priority={priority}
              fit="cover"
              className="rounded-[var(--bk-r-inner)] bg-bk-bg-3 transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />

            {unavailable && (
              <span className="absolute inset-x-0 bottom-0 bg-bk-fg py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-white">
                Sold Out
              </span>
            )}
          </div>
        )}

        {/* Badges sit in the flow rather than over the image, because there is
            usually no image to sit over. */}
        {(badge || unavailable) && (
          <div className={`flex flex-wrap items-center gap-1.5 ${hasPhoto ? "mt-2" : ""}`}>
            {badge && !unavailable && (
              <span className="rounded-[var(--bk-r-sm)] bg-bk-maroon px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                {badge}
              </span>
            )}
            {unavailable && !hasPhoto && (
              // Solid, not bg-bk-fg/75. With no image behind it this badge has
              // no opaque ancestor, so a translucent ground resolved against
              // the white page and the contrast audit read it as white on
              // white. --bk-muted against white is 5.7:1, and grey reads as
              // "unavailable" where the maroon Best Seller badge reads as a
              // claim.
              <span className="rounded-[var(--bk-r-sm)] bg-bk-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white">
                Sold Out
              </span>
            )}
          </div>
        )}

        <h3 className="mt-1.5 text-sm font-medium leading-snug text-bk-fg">
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
          {blocked ? "Unavailable" : "Add to Cart"}
        </span>
      </button>
    </article>
  );
}
