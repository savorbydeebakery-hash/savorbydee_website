"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Loaded only if the wait lasts long enough to show it (see the effect below).
// The player's engine is a 462 KB download, half of everything on the homepage.
const CakeLottie = dynamic(() => import("@/components/kinetic/cake-lottie").then((m) => m.CakeLottie), { ssr: false });

/**
 * The cake loader, with the room around it moving too.
 *
 * The cake DotLottie on its own reads as a spinner someone drew: it loops in
 * place on flat white and the page feels stalled rather than busy. What is
 * added here is ambience, not a second animation competing with it — a warm
 * glow breathing under the cake, three sprinkles drifting up past it, and a
 * line of text that fades in only if the wait runs long enough to need
 * explaining.
 *
 * Everything added is transform/opacity on absolutely positioned elements, so
 * nothing here can reflow the cake or shift the page.
 *
 * Reduced motion: the CSS keyframes below are wrapped in a
 * `prefers-reduced-motion: no-preference` query in globals.css, so those
 * visitors get the glow, the sprinkles and the message as static decoration —
 * present, just still. The Lottie itself is the exception: it is the loading
 * indicator, and a frozen cake would read as a broken page rather than a calm
 * one.
 */
export function CakeLoader({
  /** Height of the animation box. The route loaders use the default. */
  size = "h-32 w-32",
  /** Shown under the cake after ~2.5s (immediately under reduced motion), so
   *  a fast load never flashes text. */
  message = "Getting things out of the oven…",
  className = "",
}: {
  size?: string;
  message?: string;
  className?: string;
}) {
  // The same delay as the fade-in in globals.css: a page that arrives quickly
  // never shows the cake, so it shouldn't download it either.
  const [showCake, setShowCake] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShowCake(true), 350);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      // cake-loader: shown after a short delay (globals.css), so fast loads
      // never flash it. A full screen tall, because the footer is drawn below
      // this: at half a screen it sat in view until the page arrived and pushed
      // it off, the biggest jump on the site (layout shift 0.35, 2026-11-03).
      className={`cake-loader flex min-h-[100svh] flex-col items-center justify-center ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {/* Warm glow. Sits behind the cake and breathes. */}
        <span
          aria-hidden="true"
          className="cake-loader-glow absolute size-40 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--bk-pink)_70%,transparent),transparent_70%)] opacity-70 blur-xl"
        />

        {/* Sprinkles drifting up past the cake, each on its own delay. */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`cake-loader-sprinkle cake-loader-sprinkle-${i + 1} absolute size-1.5 rounded-full`}
          />
        ))}

        {/* The box keeps its size until the cake arrives. */}
        <div className={`relative ${size}`}>{showCake && <CakeLottie className="h-full w-full" />}</div>
      </div>

      {/* No opacity-0 here: the delayed fade-in is applied by the stylesheet
          under prefers-reduced-motion: no-preference. Hiding it in the markup
          meant a reduced-motion visitor never saw it at all. */}
      <p className="cake-loader-message mt-4 text-sm text-bk-muted">{message}</p>
    </div>
  );
}
