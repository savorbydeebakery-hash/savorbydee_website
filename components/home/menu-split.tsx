"use client";

import { useState } from "react";
import Link from "next/link";
import { ItemDetailModal } from "@/components/item-detail-modal";
import { ProductMiniCard } from "@/components/home/product-mini-card";
import { SectionHead } from "@/components/home/section-head";
import type { MenuItemForCart } from "@/lib/cart/types";

interface Panel {
  title: string;
  /** One quiet line under the title. Little Token uses none; at desktop
   *  widths the panel is wide enough that it needs one. */
  blurb: string;
  href: string;
  items: MenuItemForCart[];
  /** Shown in place of the grid when the client has flagged nothing. */
  empty: string;
  /** Pink wash behind the panel, used to separate the two halves. */
  tinted?: boolean;
}

/**
 * Two menu panels side by side: 50/50 from `lg` up, stacked below it.
 *
 * The panels are siblings in one grid rather than two sections, so their tops
 * align and `items-stretch` (the grid default) gives them equal height without
 * either one being told what that height is.
 *
 * Both halves feed one ItemDetailModal. Two modals — one per panel — is the
 * obvious build and it is wrong: opening an item in the right panel while the
 * left one is mounted gives two dialogs competing for the same focus trap.
 */
export function MenuSplit({
  left,
  right,
}: {
  left: Panel;
  right: Panel;
}) {
  const [selected, setSelected] = useState<MenuItemForCart | null>(null);

  // Nothing flagged on either side — the whole section is noise.
  if (left.items.length === 0 && right.items.length === 0) return null;

  return (
    <section className="mx-auto mt-8 w-full max-w-[var(--bk-page-width)] px-4 md:mt-14 md:px-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <MenuPanel panel={left} onSelect={setSelected} />
        <MenuPanel panel={right} onSelect={setSelected} />
      </div>

      {selected && (
        <ItemDetailModal
          item={selected}
          open={selected !== null}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function MenuPanel({
  panel,
  onSelect,
}: {
  panel: Panel;
  onSelect: (item: MenuItemForCart) => void;
}) {
  return (
    <div
      className={`flex flex-col rounded-[var(--bk-r-block)] border border-bk-border p-4 md:p-6 ${
        panel.tinted ? "bg-bk-pink-soft" : "bg-bk-bg"
      }`}
    >
      <SectionHead title={panel.title} href={panel.href} />
      <p className="-mt-1 mb-4 text-sm leading-relaxed text-bk-muted md:mb-5">
        {panel.blurb}
      </p>

      {panel.items.length === 0 ? (
        <p className="rounded-[var(--bk-r-inner)] bg-bk-bg-3 px-4 py-8 text-center text-sm text-bk-muted">
          {panel.empty}
        </p>
      ) : (
        // Two across on a phone is Little Token's grid. Desktop keeps two per
        // PANEL rather than going to four, so a card in the left panel stays
        // the same size as a card in the right one.
        <div className="grid grid-cols-2 gap-3">
          {panel.items.slice(0, 4).map((item) => (
            <ProductMiniCard
              key={item.id}
              item={item}
              onSelect={onSelect}
              sizes="(max-width: 768px) 45vw, 240px"
            />
          ))}
        </div>
      )}

      <Link
        href={panel.href}
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-[var(--bk-r-pill)] bg-bk-btn px-6 text-sm font-medium text-bk-btn-fg transition-opacity hover:opacity-85 md:mt-auto"
      >
        {`View ${panel.title}`}
      </Link>
    </div>
  );
}
