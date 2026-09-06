"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/kinetic/smart-image";
import { CardFlip } from "@/components/ui/card-flip";
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
 * The card turns over to show the full description. Which control turns it
 * depends on what the item has — photo, no photo, or nothing to say — see
 * components/home/product-mini-card.tsx, which follows the same rule so a card
 * behaves the same wherever it appears.
 *
 * E2E CONTRACT — do not remove, e2e/*.spec.ts selects on all of these:
 *   .menu-item-card, data-item-id, data-item-name (lowercased) on the root
 *   data-item-id, data-item-name, data-item-price on the button
 *   button text "Add to Cart" / "Unavailable"
 */

/**
 * Wraps the photo in a button, but only when there is a description behind it.
 * An item with a photo and nothing to say keeps a plain image — a control that
 * does nothing is worse than no control.
 */
function PhotoControl({
  canFlip,
  name,
  onFlip,
  children,
}: {
  canFlip: boolean;
  name: string;
  onFlip: () => void;
  children: React.ReactNode;
}) {
  if (!canFlip) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={`What is in ${name}?`}
      className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cocoa"
    >
      {children}
    </button>
  );
}

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
  const [flipped, setFlipped] = useState(false);
  const price = `₹${(item.base_price_cents / 100).toFixed(0)}+`;
  const hasImage = Boolean(item.image_url);
  const description = item.description?.trim() ?? "";
  // 104 of the 124 live items carry no description. Without this the "Read the
  // full description" button would appear on most of the menu and turn the
  // card over to an empty panel.
  const canFlip = description.length > 0;
  // See product-mini-card: a tracked item at 0 is unavailable.
  const unavailable = item.is_sold_out || item.stock_count === 0;
  // See product-mini-card: shop-closed greys the card without claiming the
  // item itself is unavailable.
  const { canOrder } = useCanOrder(item);
  const blocked = unavailable || !canOrder;
  const tilt = useTilt<HTMLElement>(6);

  // The chrome moved from the <article> onto each face: the border, ground and
  // radius have to turn with the card, and `overflow-hidden` on an ancestor
  // flattens a 3D transform. The article is now the perspective wrapper and
  // carries the tilt and the E2E hooks.
  const faceChrome =
    "flex h-full flex-col overflow-hidden rounded-[var(--r-lg)] border border-ink/8 bg-porcelain";

  const front = (
    <div className={faceChrome}>
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
          {/* With something to read on the back the photo is the control that
              turns the card, so no separate button is drawn. Lens still works
              inside it — a press-and-hold zooms, a click turns. */}
          <PhotoControl canFlip={canFlip} name={item.name} onFlip={() => setFlipped(true)}>
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
          </PhotoControl>
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
        {/* The description lives on the back of the card. It used to sit here
            clamped to two lines, which cut every one of the client's cake
            descriptions mid-sentence. Only drawn when there is no photo to
            click — with a photo, the photo is the control. */}
        {canFlip && !hasImage && (
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="self-start text-sm font-medium text-berry underline underline-offset-4 transition-colors hover:text-cocoa focus:outline-none focus-visible:ring-2 focus-visible:ring-cocoa focus-visible:ring-offset-2"
          >
            View description
          </button>
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
    </div>
  );

  const back = (
    <div className={`${faceChrome} gap-2 p-4`}>
      <p className="text-xs uppercase tracking-wide text-ink-soft">{item.name}</p>
      <p className="flex-1 overflow-y-auto text-sm leading-relaxed text-ink">{description}</p>
      <button
        type="button"
        onClick={() => setFlipped(false)}
        className="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-medium text-ink-soft transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-cocoa focus-visible:ring-offset-2"
      >
        <RotateCcw size={14} aria-hidden="true" />
        Back
      </button>
    </div>
  );

  return (
    <article
      ref={tilt}
      className={`menu-item-card group h-full transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 motion-reduce:hover:translate-y-0 ${
        !canOrder ? "opacity-50 grayscale" : ""
      }`}
      data-item-id={item.id}
      data-item-name={item.name.toLowerCase()}
      data-orderable={canOrder ? "true" : "false"}
    >
      {canFlip ? <CardFlip flipped={flipped} front={front} back={back} /> : front}
    </article>
  );
}
