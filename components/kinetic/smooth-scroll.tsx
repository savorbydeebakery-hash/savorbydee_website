"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { setScrollVelocity } from "@/lib/motion/scroll-velocity";

/**
 * Lenis smooth scrolling, driven by GSAP's ticker.
 *
 * `lenis` has been a dependency of this project from the start and was never
 * wired up. It is the one thing that changes how the whole site *feels* to
 * scroll rather than adding another animation to look at, which is what the
 * client asked for.
 *
 * FOUR THINGS THIS HAS TO GET RIGHT, each learned the hard way by everyone who
 * has ever added smooth scrolling to an app that already worked:
 *
 * 1. ONE CLOCK. Lenis on its own rAF and ScrollTrigger on GSAP's ticker means
 *    two loops reading and writing scroll in the same frame, which shows up as
 *    pinned or scrubbed elements lagging a frame behind the page. So autoRaf
 *    is off and lenis.raf is called from gsap.ticker, with lag smoothing
 *    disabled — GSAP's catch-up jump would otherwise teleport the page.
 *
 * 2. DIALOGS SCROLL NATIVELY. `prevent` opts any [role="dialog"] subtree out,
 *    so the item sheet's own overflow still works while it is open. The body
 *    scroll lock the modal applies keeps the page behind it still.
 *
 * 3. ADMIN IS LEFT ALONE. Staff use those pages as a tool, often on a laptop
 *    trackpad, and a tool should scroll exactly as the operating system does.
 *
 * 4. REDUCED MOTION MEANS NATIVE SCROLL. Smoothing is interpolated motion the
 *    visitor did not ask for; those visitors get the browser's own scrolling,
 *    and the media query is watched live rather than read once.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    if (isAdmin) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stop: (() => void) | undefined;

    const start = async () => {
      if (query.matches || stop) return;
      const { default: Lenis } = await import("lenis");
      // Lenis ships a stylesheet whose main job is `html.lenis { height: auto }`.
      // This layout puts h-full on <html>, which pins it to the viewport
      // height — exactly the case that rule exists for.
      await import("lenis/dist/lenis.css");

      const lenis = new Lenis({
        // Long enough to feel eased, short enough that a flick still lands
        // where the reader expects. Beyond ~1.2 it reads as fighting them.
        duration: 0.9,
        autoRaf: false,
        // Keeps Lenis's own opt-out attributes working. Passing a function
        // REPLACES the built-in prevent rather than adding to it, so dropping
        // data-lenis-prevent here would quietly disarm the escape hatch the
        // next scrollable overlay reaches for.
        prevent: (node) =>
          Boolean(
            node.closest?.('[role="dialog"]') ||
              node.closest?.("[data-lenis-prevent]") ||
              node.closest?.("[data-lenis-prevent-wheel]") ||
              node.closest?.("[data-lenis-prevent-touch]")
          ),
      });

      const raf = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      // Published for anything that wants to react to scroll speed rather than
      // scroll position — see lib/motion/scroll-velocity.ts.
      lenis.on("scroll", ({ velocity }: { velocity: number }) => setScrollVelocity(velocity));
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      ScrollTrigger.refresh();

      stop = () => {
        setScrollVelocity(0);
        gsap.ticker.remove(raf);
        gsap.ticker.lagSmoothing(500, 33); // GSAP's own defaults
        lenis.destroy();
        stop = undefined;
        ScrollTrigger.refresh();
      };
    };

    const onPreferenceChange = () => {
      if (query.matches) stop?.();
      else void start();
    };

    void start();
    query.addEventListener("change", onPreferenceChange);

    return () => {
      query.removeEventListener("change", onPreferenceChange);
      stop?.();
    };
  }, [isAdmin]);

  return null;
}
