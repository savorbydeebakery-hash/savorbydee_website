"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/**
 * Page-loading screen: shows the cake DotLottie animation while
 * the server streams the page (network slow / data fetch).
 * Animation only — no skeleton bars, no text.
 */
export function LottieLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <DotLottieReact
        src="/Cake.lottie"
        loop
        autoplay
        className="h-32 w-32"
      />
    </div>
  );
}