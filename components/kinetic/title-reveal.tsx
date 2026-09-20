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
 * WHY AN OBSERVER AND NOT A SWEEP
 * Two attempts at "sweep the document once" failed, and the second is the
 * instructive one:
 *   - keyed on nothing, the sweep ran once per hard load, so every client
 *     navigation in this App Router app got no animation at all;
 *   - keyed on the pathname, it ran at navigation time — while the route's
 *     loading.tsx was still on screen. That fallback has no headings, so the
 *     sweep found zero and never looked again once the real page streamed in.
 * A MutationObserver has no such timing to get right: a heading is animated
 * when it appears, whenever that is, including inside a Suspense boundary that
 * resolves seconds later.
 *
 * WHY ONLY HEADINGS BELOW THE FOLD
 * A ScrollTrigger whose start point has already been passed fires the moment
 * it is created, so a heading in view would get inline styles written onto it
 * while React was still hydrating that <h1> — a real mismatch, logged on every
 * page load. Animating only what is still below the fold removes that race by
 * construction, and is the right call visually anyway: a heading already on
 * screen has not "arrived", and wiping it in after the fact reads as a page
 * still loading.
 *
 * Reduced motion gets nothing at all: this runs inside matchMedia, so those
 * headings are simply there.
 */
export function TitleReveal() {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Headings already handled, so a re-render that touches the DOM does not
      // animate the same one twice.
      const seen = new WeakSet<HTMLElement>();
      let queued = 0;

      const attach = () => {
        queued = 0;
        gsap.utils.toArray<HTMLElement>(".bk-section-title").forEach((title) => {
          if (seen.has(title)) return;
          seen.add(title);
          if (title.getBoundingClientRect().top <= window.innerHeight) return;

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
      };

      // Coalesced to one pass per frame: a streaming page mutates the DOM
      // hundreds of times, and each pass walks every heading on it.
      const schedule = () => {
        if (queued) return;
        queued = requestAnimationFrame(attach);
      };

      attach();
      const observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        observer.disconnect();
        if (queued) cancelAnimationFrame(queued);
      };
    });

    return () => mm.revert();
  }, []);

  return null;
}
