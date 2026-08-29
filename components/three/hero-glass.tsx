"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

/**
 * Mount gate for the WebGL centrepiece.
 *
 * three + R3F is ~180KB gzipped, which is real money on a phone in Shillong.
 * It loads only when all four are true:
 *   1. viewport >= 1024px          (it is decoration; phones get the CSS props)
 *   2. no prefers-reduced-motion
 *   3. the browser is idle         (never competes with the LCP image)
 *   4. the hero is on screen       (unmounts when scrolled past, freeing the
 *                                   GPU context instead of rendering forever)
 *
 * ssr:false is required: three touches window/document at import time.
 */
const Scene = dynamic(() => import("./hero-glass-scene"), {
  ssr: false,
  loading: () => null,
});

export function HeroGlass({ className = "" }: { className?: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const bigEnough = window.matchMedia("(min-width: 1024px)").matches;
    const wantsMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!bigEnough || !wantsMotion) return;

    const idle =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 900));
    const handle = idle(() => setAllowed(true));

    return () => {
      const cancel = window.cancelIdleCallback ?? window.clearTimeout;
      cancel(handle as number);
    };
  }, []);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={holder} aria-hidden="true" className={className}>
      {allowed && onScreen && <Scene />}
    </div>
  );
}
