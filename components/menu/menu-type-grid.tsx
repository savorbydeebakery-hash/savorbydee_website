"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  /**
   * Scroll-spy: the chip for the section you are reading lights up, and the
   * chip row centres it.
   *
   * One ScrollTrigger across the whole list picking the nearest section on
   * each update, rather than one trigger per section with a start/end band.
   * The band version left gaps: most daily items are text-only, so a section
   * can be ~100px tall, shorter than the margin between sections — whenever
   * the band landed in a gap NO chip was current, and the highlight blinked
   * off between categories.
   *
   * The chip is centred by setting the row's own scrollLeft, NOT by calling
   * scrollIntoView on it. scrollIntoView walks every scrollable ancestor, the
   * document included: once the chip row had scrolled off the top, each
   * highlight change dragged the whole page back up to it, so the menu could
   * not be scrolled past the second category at all.
   *
   * Runs for everyone, reduced motion included: this is a position indicator,
   * not decoration. Only the chip row's own scroll is made instant for them.
   */
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const sections = Array.from(el.querySelectorAll<HTMLElement>("section[id^='cat-']"));
      if (sections.length === 0) return;

      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let currentId: string | null = null;

      const pick = () => {
        const band = window.innerHeight * 0.45;
        // The last section whose top has passed the band is the one being
        // read; before any has, the first section owns it.
        let found = sections[0];
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= band) found = section;
        }
        if (found.id === currentId) return;
        currentId = found.id;
        setActiveId(found.id);

        const chip = el.querySelector<HTMLElement>(`[data-chip="${found.id}"]`);
        const scroller = chip?.closest<HTMLElement>("nav");
        if (!chip || !scroller) return;
        scroller.scrollTo({
          left: chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2,
          behavior: smooth ? "smooth" : "auto",
        });
      };

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

      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: pick,
        onRefresh: pick,
      });
      pick();
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
                    data-chip={anchorId(g.name)}
                    aria-current={activeId === anchorId(g.name) ? "true" : undefined}
                    className={`inline-flex h-9 items-center rounded-[var(--bk-r-pill)] border px-4 text-sm transition-all duration-300 ease-[var(--ease-out)] focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg focus-visible:ring-offset-2 motion-reduce:transition-none ${
                      activeId === anchorId(g.name)
                        ? "border-bk-maroon bg-bk-maroon text-white"
                        : "border-bk-border text-bk-fg hover:border-bk-fg"
                    }`}
                  >
                    {g.name}
                    <span
                      className={`ml-1.5 ${
                        activeId === anchorId(g.name) ? "text-white/70" : "text-bk-muted"
                      }`}
                    >
                      {g.items.length}
                    </span>
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
    </div>
  );
}
