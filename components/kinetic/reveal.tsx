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
 * failed to run the content stayed invisible forever.
 *
 * That guarantee needs `immediateRender: false`, which was missing. A bare
 * gsap.from() renders its start state at once, so every wrapper below the fold
 * was painted at opacity 0 and only a firing ScrollTrigger brought it back — a
 * trigger whose start point is never reached (a short last section, a page
 * that cannot scroll further) meant a section gone for good. With it false the
 * content simply sits there until the tween actually runs.
 *
 * TRANSFORMS ARE CLEARED ON COMPLETION, and that is not tidiness. A non-none
 * transform makes the element the containing block for any `position: fixed`
 * descendant. ItemDetailModal is rendered from inside one of these wrappers on
 * the homepage: with a transform left behind, its fixed backdrop resolved
 * against the section box instead of the viewport and the dialog opened
 * off-screen while the body scroll lock held. The modal is portalled now, but
 * the next fixed thing someone nests in here should not have to know that.
 * Parallax wrappers keep a transform by definition — that is the effect — so
 * the drift moved to an inner element, leaving the outer one clean.
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
  const parallaxRef = useRef<HTMLDivElement>(null);

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
          immediateRender: false,
          // Leaves no transform on the element once it has arrived.
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: el, start: REVEAL_START, once },
        });

        // The drift goes on the inner element, never on `el`: the two tweens
        // both wrote `y` on the same node, so the scrub captured its start
        // value mid-reveal and each fought the other for the last word.
        const drift = parallaxRef.current;
        if (parallax && drift) {
          gsap.to(drift, {
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
    // The class is a marker, not styling: e2e/motion.spec.ts asserts that no
    // wrapper is left carrying a transform, and needs to tell a wrapper apart
    // from the drift element inside it (which keeps one by design).
    <div ref={ref} className={`kinetic-reveal ${className}`}>
      {parallax ? (
        <div ref={parallaxRef} className="kinetic-reveal-drift">
          {children}
        </div>
      ) : (
        children
      )}
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
        // 3D rise rather than a flat fade: cards tip up from below the plane
        // and settle. Perspective lives on the container so all children share
        // one vanishing point, otherwise each card gets its own and the group
        // reads as unrelated pieces rather than one surface.
        gsap.set(el, { perspective: 900 });
        gsap.set(items, { transformOrigin: "50% 100%" });

        gsap.from(items, {
          y: 56,
          z: -120,
          rotateX: -14,
          opacity: 0,
          duration: 0.9,
          ease: EASE,
          stagger,
          scrollTrigger: { trigger: el, start: REVEAL_START, once: true },
        });

        // Then a light scroll-linked drift so the grid keeps moving after it
        // has arrived, instead of freezing the moment it lands.
        items.forEach((item, i) => {
          const depth = 0.25 + ((i % 3) * 0.18);
          gsap.to(item, {
            y: -26 * depth,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.2,
            },
          });
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
