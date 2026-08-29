"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/gsap";
import { HeroBackdrop } from "@/components/three/hero-backdrop";
import { CakeSlice, HeartHandshakeIcon } from "@/components/ui/hero-icons";

const BakeryItems = dynamic(() => import("@/components/three/bakery-items-scene"), {
  ssr: false,
  loading: () => null,
});

/**
 * Hero, following the client's reference composition:
 *   a light card floating on a tinted field
 *   left  - display headline with alternating emphasis, sub, CTAs, proof badges
 *   right - three bakery items with handwritten labels curving around them
 *
 * The three items are real Three.js geometry rather than photographs, as asked.
 * They are gated to desktop and non-reduced-motion; below that the card keeps
 * its full layout and the right column simply collapses, so the hero never
 * depends on WebGL to be usable.
 *
 * Palette is the client's pastel pink, not the reference's lilac.
 */

const BADGES = [
  { icon: CakeSlice, label: "Quality" },
  { icon: HeartHandshakeIcon, label: "Passion" },
  { icon: null, label: "Warmth" },
];

export function HeroCard({ className }: { images?: string[]; className?: string }) {
  const scope = useRef<HTMLElement>(null);

  const subscribe = useCallback((onChange: () => void) => {
    const w = window.matchMedia("(min-width: 768px)");
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    w.addEventListener("change", onChange);
    m.addEventListener("change", onChange);
    return () => {
      w.removeEventListener("change", onChange);
      m.removeEventListener("change", onChange);
    };
  }, []);

  // Width only. Reduced motion must not remove the items: they are the right
  // column, and gating them on it left three floating labels over an empty
  // box. Motion preference is handled inside the scene instead.
  const showItems = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(min-width: 768px)").matches,
    () => false
  );

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Line by line, not letter by letter: a per-letter stagger on a serif
        // this large reads as a gimmick.
        gsap.from("[data-line]", {
          yPercent: 115,
          duration: 1,
          ease: "power4.out",
          stagger: 0.09,
        });
        gsap.from("[data-hero-sub], [data-hero-cta], [data-hero-badges]", {
          y: 18,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
          delay: 0.35,
        });
        gsap.from("[data-script]", {
          opacity: 0,
          duration: 1.2,
          ease: "power2.out",
          stagger: 0.18,
          delay: 0.9,
        });
      });

      return () => mm.revert();
    },
    { scope }
  );

  return (
    <section ref={scope} className={className}>
      <div className="relative bg-blush px-3 py-3 sm:px-5 sm:py-5">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <HeroBackdrop className="absolute inset-0 opacity-90" />
        </div>

        <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] bg-porcelain shadow-[0_40px_120px_-40px_rgb(46_33_27_/_0.45)] sm:rounded-[40px]">
          <div className="grid items-center gap-8 px-6 py-14 sm:px-10 lg:grid-cols-[1.02fr_1fr] lg:gap-4 lg:px-16 lg:py-12">
            {/* Copy */}
            <div>
              <h1 className="text-display text-ink">
                <span className="block overflow-hidden pb-[0.06em]">
                  <span data-line className="block">
                    The <span className="text-berry">happiness</span>
                  </span>
                </span>
                <span className="block overflow-hidden pb-[0.06em]">
                  <span data-line className="block">
                    <span className="text-berry">inside</span> every
                  </span>
                </span>
                <span className="block overflow-hidden pb-[0.06em]">
                  <span data-line className="block">
                    little <span className="text-berry">crumb</span>
                  </span>
                </span>
              </h1>

              <p data-hero-sub className="mt-6 max-w-sm text-base leading-relaxed text-ink-soft">
                From the first crackle of crust to the soft crumb inside, every bake
                is made fresh to order in Shillong.
              </p>

              <div data-hero-cta className="mt-8 flex flex-wrap items-center gap-7">
                <Link
                  href="/menu"
                  className="inline-flex items-center rounded-full bg-berry px-8 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition-all hover:bg-berry/90"
                >
                  Order now
                </Link>
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition-all hover:gap-2.5 hover:text-berry"
                >
                  Open catalogue <span aria-hidden="true">&#9656;</span>
                </Link>
              </div>

              <ul data-hero-badges className="mt-10 flex flex-wrap gap-8">
                {BADGES.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex flex-col items-center gap-2.5 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/12 text-berry">
                      {Icon ? <Icon /> : <WarmthMark />}
                    </span>
                    <span className="text-eyebrow text-ink-soft">{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Three.js bakery items with handwritten labels */}
            <div className="relative h-[320px] sm:h-[420px] lg:h-[500px]">
              {showItems && (
                <div className="absolute inset-0">
                  <BakeryItems />
                </div>
              )}

              {/* Curving script labels, as in the reference. */}
              <ScriptLabel
                text="Artisan bread"
                className="left-[2%] top-[4%]"
                path="M0,34 Q70,0 150,20"
              />
              <ScriptLabel
                text="Assorted pastries"
                className="bottom-[6%] left-[0%]"
                path="M0,30 Q80,4 168,26"
              />
              <ScriptLabel
                text="Croissant"
                className="right-[14%] top-[26%]"
                path="M12,0 Q28,50 14,110"
                vertical
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Handwritten label that follows a curve, matching the reference annotations. */
function ScriptLabel({
  text,
  className,
  path,
  vertical = false,
}: {
  text: string;
  className: string;
  path: string;
  vertical?: boolean;
}) {
  const id = `p-${text.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <svg
      data-script
      aria-hidden="true"
      viewBox={vertical ? "0 0 40 120" : "0 0 180 44"}
      className={`pointer-events-none absolute ${vertical ? "h-32 w-10" : "h-11 w-44"} ${className}`}
    >
      <defs>
        <path id={id} d={path} fill="none" />
      </defs>
      <text
        className="fill-ink-soft"
        style={{ fontFamily: "var(--font-display), serif", fontSize: 15, fontStyle: "italic", letterSpacing: "0.06em" }}
      >
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
          {text}
        </textPath>
      </text>
    </svg>
  );
}

/** Simple mark for the third badge, kept in-family with the other two. */
function WarmthMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3c2.5 3 4 5.2 4 7.5a4 4 0 1 1-8 0C8 8.2 9.5 6 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7 20h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
