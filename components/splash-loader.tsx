"use client";

import { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/**
 * The first thing anyone sees: the cake, and then the page behind it.
 *
 * This is the loading animation the client means when she talks about "the
 * cake" — it is on screen on every first load, where the route-level loader is
 * only seen on a slow navigation. It used to be the Lottie alone on flat
 * white, held for a fixed 1.5s and cross-faded out, which reads as a splash
 * screen waiting out a timer.
 *
 * What it does now:
 *   - the cake sits on the bakery's own pink wash rather than white,
 *     with the same breathing glow the route loader has, so the two are
 *     recognisably one family
 *   - the wordmark rises under it, because this is also the first time the
 *     visitor sees the name
 *   - it leaves by lifting away — a curtain going up on the page — instead of
 *     dissolving in place
 *
 * TIMING. It holds for 1.4s and the lift takes 0.7s. That is a real cost on
 * every first load, so it is capped hard and never repeats within a session:
 * sessionStorage means a visitor moving between pages sees this once, not on
 * every hard navigation.
 *
 * REDUCED MOTION gets the same screen without the lift — it fades, quickly.
 * The keyframes are declared under a no-preference query in globals.css.
 *
 * FAILURE MODE: the overlay removes itself on a timer that is set in the same
 * effect that shows it. There is no path where a failed animation leaves the
 * page covered — the timers do not depend on the Lottie loading at all.
 */
const HOLD_MS = 1400;
const LIFT_MS = 700;

export function SplashLoader() {
  // Starts shown, which is also what the server renders — deciding on the
  // client first would mean either a hydration mismatch or a frame of page
  // with no curtain over it.
  const [state, setState] = useState<"hidden" | "holding" | "lifting">("holding");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("savor-splash") === "1";
    } catch {
      // Private mode or blocked storage: show it, just do not remember.
    }

    // Timers rather than a synchronous setState: a state write in the body of
    // an effect cascades an extra render before paint.
    if (seen) {
      const skip = setTimeout(() => setState("hidden"), 0);
      return () => clearTimeout(skip);
    }

    try {
      sessionStorage.setItem("savor-splash", "1");
    } catch {
      /* not worth failing the splash over */
    }

    const lift = setTimeout(() => setState("lifting"), HOLD_MS);
    const done = setTimeout(() => setState("hidden"), HOLD_MS + LIFT_MS);
    return () => {
      clearTimeout(lift);
      clearTimeout(done);
    };
  }, []);

  if (state === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      className={`splash-curtain fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bk-bg-3 ${
        state === "lifting" ? "splash-curtain-lifting pointer-events-none" : ""
      }`}
    >
      <div className="relative flex items-center justify-center">
        <span
          aria-hidden="true"
          className="cake-loader-glow absolute size-48 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--bk-pink)_75%,transparent),transparent_70%)] opacity-70 blur-xl"
        />
        <DotLottieReact src="/Cake.lottie" loop autoplay className="relative h-40 w-40" />
      </div>

      <p className="splash-wordmark mt-2 text-sm font-medium uppercase tracking-[0.3em] text-bk-fg">
        Savor by Dee
      </p>
    </div>
  );
}
