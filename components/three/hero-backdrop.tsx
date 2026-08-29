"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useSyncExternalStore } from "react";

const Scene = dynamic(() => import("./hero-backdrop-scene"), {
  ssr: false,
  loading: () => null,
});

/**
 * Mount gate for the shader backdrop.
 *
 * The CSS gradient mesh underneath is always painted, so this layers on top
 * once it is allowed to run. That means no flash, no layout shift, and a
 * correct-looking hero on phones, on reduced motion, and before the chunk
 * arrives.
 *
 * matchMedia is read through useSyncExternalStore rather than an effect: it
 * responds to resize, and it avoids the Strict-Mode race that previously left
 * the scroll-world gate stuck false in development.
 */
export function HeroBackdrop({ className = "" }: { className?: string }) {
  const holder = useRef<HTMLDivElement>(null);

  const subscribe = useCallback((onChange: () => void) => {
    const w = window.matchMedia("(min-width: 768px)");
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    w.addEventListener("change", onChange);
    m.addEventListener("change", onChange);
    return () => {
      w.removeEventListener("change", onChange);
      m.removeEventListener("change", onChange);
    };
  }, []);

  const allowed = useSyncExternalStore(
    subscribe,
    () =>
      window.matchMedia("(min-width: 768px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );

  return (
    <div ref={holder} aria-hidden="true" className={className}>
      {allowed && <Scene />}
    </div>
  );
}
