"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll-into-view reveal wrapper (CSS-driven, hydration-safe).
 *
 * SSR + first client render: content is fully visible (no hidden state) —
 * identical HTML, zero hydration risk. An IntersectionObserver adds the
 * `.kinetic-revealed` class when the element scrolls into view, which triggers
 * a CSS fade+rise keyframe animation. The global `prefers-reduced-motion`
 * block disables the animation for reduced-motion users, so they always see
 * the content instantly.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("kinetic-revealed");
            if (once) io.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={`kinetic-reveal ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

/**
 * Stagger container — wraps <RevealItem> children to cascade.
 * Reveals items sequentially when the container enters view.
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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll(".kinetic-reveal-item")) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            items.forEach((item, i) => {
              item.style.transitionDelay = `${i * stagger}s`;
              item.classList.add("kinetic-revealed");
            });
            io.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * Single item inside a <RevealGroup>. Uses CSS stagger reveal.
 */
export function RevealItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`kinetic-reveal kinetic-reveal-item ${className}`}>
      {children}
    </div>
  );
}