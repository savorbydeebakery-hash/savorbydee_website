"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

/** Anchor id for a section, and the chip that jumps to it. */
export const sectionAnchor = (name: string) =>
  "cat-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The category chips on both menus: tapping one jumps to that section, and every
 * other section stays on the page to scroll on to (client, 2026-11-04: the
 * Preorder Menu's chips used to hide everything else).
 *
 * Reads the page rather than being told about it: the sections are the
 * `section[id^='cat-']` elements sharing this nav's parent, each with the id
 * sectionAnchor() gives its name. They need scroll-mt-32 to land clear of the
 * header and this row.
 *
 * Scroll-spy: the chip for the section you are reading lights up, and the chip
 * row centres it.
 *
 * One ScrollTrigger across the whole list picking the nearest section on each
 * update, rather than one trigger per section with a start/end band. The band
 * version left gaps: most daily items are text-only, so a section can be ~100px
 * tall, shorter than the margin between sections — whenever the band landed in a
 * gap NO chip was current, and the highlight blinked off between categories.
 *
 * The chip is centred by setting the row's own scrollLeft, NOT by calling
 * scrollIntoView on it. scrollIntoView walks every scrollable ancestor, the
 * document included: once the chip row had scrolled off the top, each highlight
 * change dragged the whole page back up to it, so the menu could not be scrolled
 * past the second category at all.
 *
 * Runs for everyone, reduced motion included: this is a position indicator, not
 * decoration. Only the chip row's own scroll is made instant for them.
 */
export function CategoryJumpNav({ sections }: { sections: { name: string; count: number }[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const nav = navRef.current;
      const el = nav?.parentElement;
      if (!nav || !el) return;
      const targets = Array.from(el.querySelectorAll<HTMLElement>("section[id^='cat-']"));
      if (targets.length === 0) return;

      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let currentId: string | null = null;

      // A customer who swipes the chip row to look ahead should be left alone.
      // Without this the next scroll tick yanked the row back to the chip for
      // the section they were still standing in.
      let swipedAt = 0;
      const noteSwipe = () => {
        swipedAt = Date.now();
      };
      nav.addEventListener("pointerdown", noteSwipe);
      nav.addEventListener("wheel", noteSwipe, { passive: true });

      // Placing the pill is separate from choosing the section, because the
      // pill can go stale without the section changing: a webfont swapping in
      // after first paint changes every chip's width. pick() used to return
      // early on "same section" before it ever got here, so ScrollTrigger's
      // onRefresh could not put it right.
      const placePill = (id: string, animate: boolean) => {
        const chip = nav.querySelector<HTMLElement>(`[data-chip="${id}"]`);
        if (!chip || !pill.current) return;
        gsap.to(pill.current, {
          x: chip.offsetLeft,
          width: chip.offsetWidth,
          autoAlpha: 1,
          duration: animate && smooth ? 0.45 : 0,
          ease: "power3.out",
        });
      };

      const pick = () => {
        const band = window.innerHeight * 0.45;
        // The last section whose top has passed the band is the one being
        // read; before any has, the first section owns it.
        let found = targets[0];
        for (const section of targets) {
          if (section.getBoundingClientRect().top <= band) found = section;
        }
        // The maroon pill slides from the chip you were on to the one you are
        // on, so the row reads as one indicator moving rather than two chips
        // changing colour. It is a plain absolutely-positioned span: no Flip
        // plugin, and nothing to lay out if GSAP never runs — the chip also
        // carries its own [aria-current] styling underneath.
        if (found.id === currentId) {
          placePill(found.id, false); // keeps it true after a reflow
          return;
        }
        const first = currentId === null;
        currentId = found.id;
        setActiveId(found.id);
        placePill(found.id, !first);

        const chip = nav.querySelector<HTMLElement>(`[data-chip="${found.id}"]`);
        if (!chip) return;
        if (Date.now() - swipedAt < 2000) return;

        // Only when the chip is actually out of sight. Re-centring one that is
        // already visible slides the row under the reader for no reason.
        const left = chip.offsetLeft - nav.scrollLeft;
        if (left >= 0 && left + chip.offsetWidth <= nav.clientWidth) return;

        nav.scrollTo({
          left: chip.offsetLeft - (nav.clientWidth - chip.offsetWidth) / 2,
          behavior: smooth ? "smooth" : "auto",
        });
      };

      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: pick,
        onRefresh: pick,
      });
      pick();

      return () => {
        nav.removeEventListener("pointerdown", noteSwipe);
        nav.removeEventListener("wheel", noteSwipe);
      };
    },
    // Searching changes which sections are on the page.
    { scope: navRef, dependencies: [sections.map((s) => s.name).join("|")] }
  );

  // Sticky under the 64px header: a jump list that scrolls away is only useful
  // for the first screenful, and the moving indicator it carries says nothing if
  // it cannot be seen. The background is the page's own, so rows pass behind it
  // rather than through it.
  return (
    <nav
      ref={navRef}
      aria-label="Menu categories"
      className="no-scrollbar sticky top-16 z-20 -mx-4 mb-4 overflow-x-auto bg-bk-bg px-4 py-3 md:mx-0 md:mb-6 md:px-0"
    >
      <ul className="relative flex w-max gap-2">
        {/* Sits under the chips; invisible until the spy places it. */}
        <span
          ref={pill}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 invisible rounded-[var(--bk-r-pill)] bg-bk-maroon"
        />
        {sections.map((s) => {
          const id = sectionAnchor(s.name);
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                data-chip={id}
                aria-current={activeId === id ? "location" : undefined}
                className={`relative inline-flex h-9 items-center whitespace-nowrap rounded-[var(--bk-r-pill)] border px-4 text-sm transition-colors duration-300 ease-[var(--ease-out)] focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg focus-visible:ring-offset-2 motion-reduce:transition-none ${
                  activeId === id ? "border-bk-maroon text-white" : "border-bk-border text-bk-fg hover:border-bk-fg"
                }`}
              >
                {s.name}
                <span className={`ml-1.5 ${activeId === id ? "text-white/70" : "text-bk-muted"}`}>{s.count}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
