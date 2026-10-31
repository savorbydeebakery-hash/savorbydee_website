"use client";

import { useEffect, useRef } from "react";

/**
 * Page scroll progress, drawn as a hairline under the header.
 *
 * Driven by scaleX on a pre-sized bar rather than by animating width, so it
 * stays on the compositor and never triggers layout. transformOrigin is left so
 * it grows from the start of the line.
 *
 * The ratio is worked out from the page's height AT THAT MOMENT, at most once
 * a frame. It used to be a ScrollTrigger whose end was measured at load; pages
 * that grow afterwards (photos arriving on the menus and the gallery) left it
 * reading 54% at the very bottom of the Preorder menu and 100% halfway down
 * the gallery (checked 2026-11-01). A ResizeObserver redraws it when the page
 * grows or shrinks without a scroll.
 */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.transform = "scaleX(0)";
      return;
    }

    let frame = 0;
    const draw = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // Within a couple of pixels of the bottom counts as the end: mobile
      // browsers stop a fraction short as the address bar settles.
      const ratio = max <= 2 ? 0 : window.scrollY >= max - 2 ? 1 : window.scrollY / max;
      el.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const grow = new ResizeObserver(schedule);
    grow.observe(document.body);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      grow.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
    >
      <div ref={bar} className="h-full w-full origin-left bg-berry" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
