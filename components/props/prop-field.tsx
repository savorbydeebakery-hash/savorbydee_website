"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/gsap";

/**
 * Positions decorative 3D props inside a section and binds them all to ONE
 * ScrollTrigger.
 *
 * One trigger per section, not one per prop — that is the difference between
 * 60fps and 25fps once there are a dozen props on the page. Each child reads
 * its own `data-depth` (0..1) to scale how far it travels, so a single tween
 * with function-based values drives the whole field.
 *
 * Only `transform` and `opacity` are animated. Never top/left/width/filter.
 */
export function PropField({
  children,
  className = "",
  /** Base travel in px at depth 1.0. */
  travel = 160,
  /** Base Z-rotation in degrees at depth 1.0. */
  spin = 25,
}: {
  children: ReactNode;
  className?: string;
  travel?: number;
  spin?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = ref.current;
      if (!section) return;

      const props = section.querySelectorAll<HTMLElement>("[data-prop]");
      if (props.length === 0) return;

      const mm = gsap.matchMedia();

      // Desktop/tablet only. Phones keep the props rendered but static —
      // scroll-scrubbed transforms on low-end Android are where the frame
      // budget goes, and these are pure decoration.
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          const tween = gsap.to(props, {
            y: (_i, el: HTMLElement) => -travel * Number(el.dataset.depth ?? 0.5),
            rotate: (_i, el: HTMLElement) => spin * Number(el.dataset.depth ?? 0.5),
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
              // will-change only while the section is in play; leaving it on
              // permanently keeps a compositor layer alive for every prop.
              onToggle: ({ isActive }) => {
                props.forEach((p) => {
                  p.style.willChange = isActive ? "transform" : "auto";
                });
              },
            },
          });

          return () => {
            tween.scrollTrigger?.kill();
            tween.kill();
            props.forEach((p) => (p.style.willChange = "auto"));
          };
        }
      );

      return () => mm.revert();
    },
    { scope: ref, dependencies: [travel, spin] }
  );

  // overflow-clip stops a prop that drifts sideways from creating a horizontal
  // scrollbar on narrow viewports.
  return (
    <div ref={ref} className={`relative overflow-x-clip ${className}`}>
      {children}
    </div>
  );
}
