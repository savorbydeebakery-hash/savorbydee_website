"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

/**
 * Page scroll progress, drawn as a hairline under the header.
 *
 * Driven by scaleX on a pre-sized bar rather than by animating width, so it
 * stays on the compositor and never triggers layout. transformOrigin is left so
 * it grows from the start of the line.
 */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = bar.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.set(el, { scaleX: 0, transformOrigin: "0 50%" });
      const st = ScrollTrigger.create({
        start: 0,
        end: () => document.documentElement.scrollHeight - window.innerHeight,
        onUpdate: (self) => gsap.set(el, { scaleX: self.progress }),
        invalidateOnRefresh: true,
      });
      return () => st.kill();
    });
    return () => mm.revert();
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
    >
      <div ref={bar} className="h-full w-full bg-berry" />
    </div>
  );
}
