"use client";

import { useState } from "react";
import Link from "next/link";
import { ItemDetailModal } from "@/components/item-detail-modal";
import { ProductMiniCard } from "@/components/home/product-mini-card";
import type { MenuItemForCart } from "@/lib/cart/types";

/** One category's worth of the menu. */
export interface MenuGroup {
  id: string;
  name: string;
  items: MenuItemForCart[];
}

/** Anchor id for a section, and the chip that jumps to it. */
const anchorId = (name: string) =>
  "cat-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The item grid on a single menu-type page (/menu/daily, /menu/preorder, …).
 *
 * Two across on a phone, four on desktop — Little Token's 2-up widened rather
 * than a new grammar, so a card is the same object here as on the homepage.
 * One modal for the whole grid, not one per card.
 *
 * Pass `groups` to break the grid into category sections with a chip row that
 * jumps to them, which is how the daily list reads on Swiggy. 45 items in one
 * undifferentiated grid gives a customer no way to find the cookies. Without
 * `groups` it stays a single flat grid.
 */
export function MenuTypeGrid({
  items,
  groups,
  empty,
}: {
  items: MenuItemForCart[];
  groups?: MenuGroup[];
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

  const sections = (groups ?? []).filter((g) => g.items.length > 0);

  return (
    <>
      {sections.length > 0 ? (
        <>
          {/* Sticky under the header so the jump list stays reachable while
              scrolling a long menu. Horizontal scroll is clipped by its own
              wrapper — see the Best Sellers rail note in HANDOFF. */}
          <nav
            aria-label="Menu categories"
            className="-mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0"
          >
            <ul className="flex w-max gap-2">
              {sections.map((g) => (
                <li key={g.id}>
                  <a
                    href={`#${anchorId(g.name)}`}
                    className="inline-flex h-9 items-center rounded-[var(--bk-r-pill)] border border-bk-border px-4 text-sm text-bk-fg transition-colors hover:border-bk-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg focus-visible:ring-offset-2"
                  >
                    {g.name}
                    <span className="ml-1.5 text-bk-muted">{g.items.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-10 md:gap-14">
            {sections.map((g) => (
              <section key={g.id} id={anchorId(g.name)} className="scroll-mt-24">
                <h2 className="bk-section-title mb-3 text-bk-fg md:mb-5">
                  {g.name}
                  <span className="ml-2 text-sm font-normal text-bk-muted md:text-base">
                    {g.items.length}
                  </span>
                </h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
                  {g.items.map((item) => (
                    <ProductMiniCard
                      key={item.id}
                      item={item}
                      onSelect={setSelected}
                      sizes="(max-width: 768px) 45vw, 300px"
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
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
      )}

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
