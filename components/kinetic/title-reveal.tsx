"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/gsap";

/**
 * Every section heading wipes itself in as you reach it.
 *
 * Mounted once in the root layout and applied by selector, rather than by
 * wrapping eight headings in eight components: `.bk-section-title` is already
 * the one class every section heading on this site carries, so there is
 * nothing to remember when the ninth section is written.
 *
 * WHY CLIP-PATH AND NOT OPACITY
 * A heading is the thing that says what a section is. If a ScrollTrigger never
 * fires — a short last section, a page that cannot scroll further, GSAP failing
 * to load at all — an opacity-based reveal leaves a section that appears to
 * have no title. The wipe animates clip-path only, is set with
 * immediateRender: false so it is never applied before the tween runs, and
 * clears itself on completion. Every failure path ends with a plain, visible
 * heading.
 *
 * Reduced motion gets nothing at all: this runs inside matchMedia, so those
 * headings are simply there.
 *
 * WHY ONLY HEADINGS BELOW THE FOLD
 * This lives in the root layout, whose effects can run before a streamed page
 * has hydrated. A ScrollTrigger whose start point has already been passed
 * fires the moment it is created, so a heading in view got inline styles
 * written onto it while React was still hydrating that <h1> — a real
 * mismatch, logged on every page load.
 *
 * Animating only what is still below the fold removes the race by
 * construction: those tweens cannot write anything until the visitor scrolls,
 * which is long after hydration. It also happens to be the right call
 * visually. A heading already on screen when the page opens has not "arrived"
 * — wiping it in after the fact is the kind of motion that makes a page feel
 * like it is still loading.
 */
export function TitleReveal() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const titles = gsap.utils
          .toArray<HTMLElement>(".bk-section-title")
          .filter((title) => title.getBoundingClientRect().top > window.innerHeight);

        titles.forEach((title) => {
          gsap.from(title, {
            // A wipe from underneath, with a touch of rise so it reads as the
            // words arriving rather than a mask sliding.
            clipPath: "inset(0 0 100% 0)",
            y: 14,
            duration: 0.8,
            ease: "power3.out",
            immediateRender: false,
            clearProps: "clipPath,transform",
            scrollTrigger: { trigger: title, start: "top bottom-=60", once: true },
          });
        });
      });
    };

    if (document.readyState === "complete") setup();
    else window.addEventListener("load", setup, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", setup);
      mm.revert();
    };
  }, []);

  return null;
}
