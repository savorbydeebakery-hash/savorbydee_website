"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/gsap";

const Scene = dynamic(() => import("./macaron-scene"), { ssr: false, loading: () => null });

/**
 * A single macaron that follows the visitor down the homepage.
 *
 * It is one fixed-position element whose transform is driven by page scroll
 * progress through a set of waypoints, so it drifts across the viewport,
 * changes size and tumbles as sections pass. It is not re-created per section:
 * the continuity IS the effect.
 *
 * Waypoints are expressed in viewport units so the path holds at any window
 * size. Positions are chosen to stay clear of the reading column: it crosses
 * behind imagery and margins, never behind body copy.
 */

type Waypoint = { at: number; x: string; y: string; scale: number; opacity: number };

const PATH: Waypoint[] = [
  { at: 0.00, x: "78vw", y: "58vh", scale: 1.0, opacity: 0 },
  { at: 0.10, x: "72vw", y: "42vh", scale: 1.1, opacity: 1 },
  { at: 0.28, x: "12vw", y: "62vh", scale: 0.8, opacity: 1 },
  { at: 0.46, x: "84vw", y: "30vh", scale: 1.25, opacity: 1 },
  { at: 0.64, x: "18vw", y: "24vh", scale: 0.7, opacity: 1 },
  { at: 0.82, x: "80vw", y: "66vh", scale: 1.05, opacity: 1 },
  { at: 1.00, x: "50vw", y: "84vh", scale: 0.55, opacity: 0 },
];

export function TravelingMacaron() {
  const holder = useRef<HTMLDivElement>(null);
  const spin = useRef(0);

  const subscribe = useCallback((onChange: () => void) => {
    const w = window.matchMedia("(min-width: 1024px)");
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    w.addEventListener("change", onChange);
    m.addEventListener("change", onChange);
    return () => {
      w.removeEventListener("change", onChange);
      m.removeEventListener("change", onChange);
    };
  }, []);

  // Desktop only. On a phone there is not enough horizontal room for it to
  // travel without crossing the text, and it would just look like an obstacle.
  const enabled = useSyncExternalStore(
    subscribe,
    () =>
      window.matchMedia("(min-width: 1024px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );

  useGSAP(
    () => {
      const el = holder.current;
      if (!el || !enabled) return;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: document.documentElement,
          start: 0,
          end: () => document.documentElement.scrollHeight - window.innerHeight,
          scrub: 1.4,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            spin.current = self.progress;
          },
        },
      });

      gsap.set(el, {
        x: PATH[0].x,
        y: PATH[0].y,
        scale: PATH[0].scale,
        opacity: PATH[0].opacity,
        xPercent: -50,
        yPercent: -50,
      });

      // Each leg is given a duration proportional to its share of the scroll,
      // so the macaron's speed matches the page rather than the segment count.
      for (let i = 1; i < PATH.length; i++) {
        const prev = PATH[i - 1];
        const next = PATH[i];
        tl.to(
          el,
          {
            x: next.x,
            y: next.y,
            scale: next.scale,
            opacity: next.opacity,
            duration: next.at - prev.at,
          },
          prev.at
        );
      }

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    },
    { dependencies: [enabled] }
  );

  if (!enabled) return null;

  return (
    <div
      ref={holder}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-20 h-[130px] w-[130px] will-change-transform"
    >
      <Scene spin={spin} />
    </div>
  );
}
