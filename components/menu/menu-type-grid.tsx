"use client";

import { useRef, useState } from "react";
import Link from "@/components/site/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/gsap";
import { CategoryJumpNav, sectionAnchor } from "@/components/menu/category-jump-nav";
import { ItemDetailModal } from "@/components/item-detail-modal";
import { KITCHEN_NOTE } from "@/lib/menu/kitchen-note";
import { ProductMiniCard } from "@/components/home/product-mini-card";
import type { MenuItemForCart } from "@/lib/cart/types";

/** One category's worth of the menu. */
export interface MenuGroup {
  id: string;
  name: string;
  items: MenuItemForCart[];
}

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
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const sections = Array.from(el.querySelectorAll<HTMLElement>("section[id^='cat-']"));

      // Cards arrive in a short stagger as their section enters the viewport.
      //
      // Two deliberate choices, both about never hiding the menu:
      //   start "top bottom-=40" fires the moment the section edges into view,
      //   not at a band partway up the page. The last section on a page that
      //   cannot scroll any further never reaches such a band, and its cards
      //   would sit at opacity 0 forever — which is how four pizzas went
      //   missing the first time this was written.
      //   immediateRender false leaves the cards visible until the tween
      //   actually runs, so a ScrollTrigger that never fires costs an
      //   animation rather than the content.
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        sections.forEach((section) => {
          gsap.from(section.querySelectorAll(".menu-item-card"), {
            y: 24,
            opacity: 0,
            duration: 0.6,
            ease: "power3.out",
            immediateRender: false,
            stagger: { each: 0.05, from: "start" },
            scrollTrigger: { trigger: section, start: "top bottom-=40", once: true },
          });
        });
      });

      // mm.revert() as well as useGSAP's own cleanup: a matchMedia instance
      // registers its own contexts and keeps a media listener that the hook's
      // context does not own, so without this they accumulate across client
      // navigations and StrictMode's double-invoke.
      return () => mm.revert();
    },
    { scope: root, dependencies: [groups] }
  );

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
    <div ref={root}>
      {sections.length > 0 ? (
        <>
          <CategoryJumpNav sections={sections.map((g) => ({ name: g.name, count: g.items.length }))} />

          <div className="flex flex-col gap-7 md:gap-14">
            {sections.map((g) => (
              <section key={g.id} id={sectionAnchor(g.name)} className="scroll-mt-32">
                <h2 className="bk-section-title mb-3 text-bk-fg md:mb-5">
                  {g.name}
                  <span className="ml-2 text-sm font-normal text-bk-muted md:text-base">
                    {g.items.length}
                  </span>
                </h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
                  {g.items.map((item, i) => (
                    <ProductMiniCard
                      key={item.id}
                      item={item}
                      onSelect={setSelected}
                      sizes="(max-width: 768px) 45vw, 300px"
                      // The first row is what a visitor sees first, and what
                      // Google times: load it ahead of everything else.
                      priority={i < 4 && g === sections[0]}
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

      <p className="mx-auto mt-12 max-w-2xl text-center text-xs text-bk-muted">{KITCHEN_NOTE}</p>

      {selected && (
        <ItemDetailModal
          item={selected}
          open={selected !== null}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
