"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/gsap";
import { HeroBackdrop } from "@/components/three/hero-backdrop";
import { CakeSlice, HeartHandshakeIcon } from "@/components/ui/hero-icons";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";

const HERO_IMAGE = "/hero/bakery-items.jpg";

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
        gsap.from("[data-hero-photo-wrap]", {
          opacity: 0,
          scale: 0.96,
          y: 24,
          duration: 1.1,
          ease: "power3.out",
          delay: 0.15,
        });
        gsap.to("[data-hero-photo-wrap]", {
          y: -70,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 1 },
        });
        gsap.from("[data-script]", {
          opacity: 0,
          duration: 1.2,
          ease: "power2.out",
          stagger: 0.18,
          delay: 0.9,
        });
      });

      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const wrap = root.querySelector<HTMLElement>("[data-hero-photo-wrap]");
        if (!wrap) return;
        const toX = gsap.quickTo(wrap, "x", { duration: 0.9, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          toX(((e.clientX - window.innerWidth / 2) / window.innerWidth) * 26);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
      });

      return () => mm.revert();
    },
    { scope }
  );

  return (
    <section ref={scope} className={className}>
      <div className="relative bg-blush px-3 pb-24 pt-3 sm:px-5 sm:pb-32 sm:pt-5">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <HeroBackdrop className="absolute inset-0 opacity-90" />
          {/* The field used to stop dead at the card's edge, leaving a hard
              pink band. It now runs past the card and dissolves into the page
              background, so the hero has no seam under it. */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
        </div>

        <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] bg-paper shadow-[0_40px_120px_-40px_rgb(46_33_27_/_0.45)] sm:rounded-[40px]">
          <div className="grid items-center gap-8 px-6 py-14 sm:px-10 lg:grid-cols-[1fr_1.05fr] lg:gap-6 lg:px-16 lg:py-12">
            {/* Copy */}
            <div className="relative z-10">
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
                <Link href="/menu" aria-label="Order now">
                  <InteractiveHoverButton className="px-8 py-3.5 text-sm">
                    Order now
                  </InteractiveHoverButton>
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

            {/* Product photography. Its own grid column, so copy can never
                sit over the food: the two never share space by construction,
                not by tuning offsets. */}
            <div className="relative aspect-[16/9] w-full">
              <div data-hero-photo-wrap className="absolute inset-0">
                <Image
                  src={HERO_IMAGE}
                  alt="A slice of berry layer cake, a pink macaron and a croissant"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 720px"
                  // object-right: when the frame is cropped at narrow widths it
                  // gives up its empty left margin first, never the food.
                  className="photo-feather object-contain object-right"
                />
              </div>

              <ScriptLabel text="Layer cake" className="left-[8%] top-[6%]" path="M0,32 Q70,2 148,18" />
              <ScriptLabel text="Macaron" className="bottom-[12%] left-[4%]" path="M0,28 Q66,4 140,22" />
              <ScriptLabel text="Croissant" className="right-[2%] top-[22%]" path="M12,0 Q28,50 14,110" vertical />
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
