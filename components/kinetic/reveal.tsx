"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE } from "@/lib/motion/gsap";

/**
 * Scroll reveal, now driven by GSAP ScrollTrigger.
 *
 * The public API (Reveal / RevealGroup / RevealItem and their props) is
 * unchanged from the IntersectionObserver version, so all ~12 call sites
 * upgrade without edits.
 *
 * FAILURE MODE, deliberately chosen: content is visible by default and GSAP
 * animates *from* a hidden state. The previous CSS version was the other way
 * round — `.kinetic-reveal:not(.kinetic-revealed)` set opacity:0, so if JS
 * failed to run the content stayed invisible forever. Now a JS failure just
 * means no animation.
 *
 * No flash: useGSAP runs in useLayoutEffect, so the from-state is applied
 * before the browser paints.
 *
 * Reduced motion is gated once here via gsap.matchMedia rather than per
 * component — those users get the final state immediately.
 */

const REVEAL_START = "top 85%";

export function Reveal({
  children,
  delay = 0,
  y = 32,
  className = "",
  once = true,
  parallax,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
  /**
   * Pixels of scroll-scrubbed vertical drift. Positive drifts up as the
   * section passes. Adds depth; use sparingly (see the prop budget).
   */
  parallax?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(el, {
          y,
          opacity: 0,
          duration: 0.9,
          delay,
          ease: EASE,
          scrollTrigger: { trigger: el, start: REVEAL_START, once },
        });

        if (parallax) {
          gsap.to(el, {
            y: -parallax,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          });
        }
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [delay, y, once, parallax] }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * Stagger container. Cascades its <RevealItem> children when it enters view.
 * One ScrollTrigger for the whole group, not one per child.
 */
export function RevealGroup({
  children,
  className = "",
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const items = el.querySelectorAll<HTMLElement>(".kinetic-reveal-item");
      if (items.length === 0) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(items, {
          y: 32,
          opacity: 0,
          duration: 0.8,
          ease: EASE,
          stagger,
          scrollTrigger: { trigger: el, start: REVEAL_START, once: true },
        });
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [stagger] }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Single item inside a <RevealGroup>. The class is the group's selector. */
export function RevealItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`kinetic-reveal-item ${className}`}>{children}</div>;
}
