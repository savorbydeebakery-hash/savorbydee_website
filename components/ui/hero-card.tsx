"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/gsap";
import { HeroBackdrop } from "@/components/three/hero-backdrop";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";

const HERO_IMAGE = "/hero/celebration-cakes-v3.jpg";

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
        gsap.from("[data-hero-sub], [data-hero-cta]", {
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
      <div className="relative bg-bk-pink px-3 pb-24 pt-3 sm:px-5 sm:pb-32 sm:pt-5">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <HeroBackdrop className="absolute inset-0 opacity-90" />
          {/* The field used to stop dead at the card's edge, leaving a hard
              pink band. It now runs past the card and dissolves into the page
              background, so the hero has no seam under it. */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bk-bg" />
        </div>

        <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] bg-white shadow-[0_40px_120px_-40px_rgb(46_33_27_/_0.45)] sm:rounded-[40px]">
          <div className="grid items-center gap-8 px-6 py-14 sm:px-10 lg:grid-cols-[0.9fr_1.45fr] lg:gap-10 lg:py-12 lg:pl-16 lg:pr-6">
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
            </div>

            {/* Product photography. Its own grid column, so copy can never
                sit over the food: the two never share space by construction,
                not by tuning offsets. */}
            {/* Floated, not framed. This plate is shot on a near-white ground
                that is genuinely flat (an 18/255 spread corner to corner), so
                the food can sit loose on the card and feather into it with no
                visible rectangle — which only works while --paper is matched
                to that ground. See the token's note in globals.css. */}
            {/* overflow-hidden so the scale below crops rather than bleeding
                over the copy column. Only flat ground is ever cropped: the
                food sits inside the middle ~65% of the frame, and the scroll
                parallax shifts the plate by 70px against a ~90px margin, so
                it cannot pull a doughnut into the clip.

                photo-feather belongs on THIS box, not on the <Image>. It masks
                the outer 6-7% of whatever it is applied to, so on the image it
                was being scaled out of view along with the dead margin — which
                left a hard cut through the middle of the plate, and the plate's
                ground is a slight left-to-right gradient, so that cut showed as
                a pale rectangle against the flat card. On the box the fade
                always lands at the visible edge, whatever the inner scale and
                wherever the parallax has pushed the plate. */}
            <div className="photo-feather relative aspect-[16/9] w-full overflow-hidden">
              <div data-hero-photo-wrap className="absolute inset-0">
                <Image
                  src={HERO_IMAGE}
                  alt="A cheese-topped savoury bun, a chocolate-glazed doughnut and a red velvet cupcake, photographed mid-air with their ingredients scattered around them"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 720px"
                  // This is a /public asset, and the custom Supabase loader
                  // hands anything that is not a Supabase object URL straight
                  // back — so every srcset candidate already resolved to this
                  // one file. Saying so silences the "loader does not
                  // implement width" warning and costs nothing: the behaviour
                  // is identical, it is just no longer implicit.
                  unoptimized
                  // contain + feather: the whole frame is shown and its edges
                  // dissolve into the card, so nothing is cropped and no seam
                  // is drawn. Centre-anchored — this is a centred cluster with
                  // slack both sides, so anchoring right would cut the bun off
                  // at narrow widths.
                  // scale-125: the plate is shot with roughly a quarter of
                  // the frame as empty ground on each side, and at 1.792
                  // against a 16/9 box it already fills that box — so the
                  // only way to make the FOOD bigger is to push the dead
                  // margin outside the crop. Nothing is lost; the ground is
                  // flat and matches --paper, so the crop edge is invisible.
                  className="scale-125 object-contain object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
