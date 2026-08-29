"use client";

import { useCallback, useEffect, useRef } from "react";
import { gsap } from "@/lib/motion/gsap";

/**
 * Pointer-tracked 3D tilt for a card.
 *
 * Uses gsap.quickTo rather than React state: tilt updates on every pointermove,
 * and routing that through setState would re-render the card tree dozens of
 * times a second.
 *
 * Fine pointers only. On touch there is no hover state to respond to, and
 * mouse-emulated events would leave cards stuck mid-tilt after a tap.
 */
export function useTilt<T extends HTMLElement>(max = 7) {
  const ref = useRef<T>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const attach = useCallback(
    (el: T | null) => {
      cleanup.current?.();
      cleanup.current = null;
      ref.current = el;
      if (!el) return;

      if (
        !window.matchMedia("(pointer: fine)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      gsap.set(el, { transformPerspective: 700, transformStyle: "preserve-3d" });

      const rx = gsap.quickTo(el, "rotateX", { duration: 0.5, ease: "power3.out" });
      const ry = gsap.quickTo(el, "rotateY", { duration: 0.5, ease: "power3.out" });
      const sc = gsap.quickTo(el, "scale", { duration: 0.5, ease: "power3.out" });

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry(px * max * 2);
        rx(-py * max * 2);
      };
      const onEnter = () => sc(1.02);
      const onLeave = () => {
        rx(0);
        ry(0);
        sc(1);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointerleave", onLeave);

      cleanup.current = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointerleave", onLeave);
        gsap.set(el, { clearProps: "rotateX,rotateY,scale" });
      };
    },
    [max]
  );

  useEffect(() => () => cleanup.current?.(), []);

  return attach;
}
