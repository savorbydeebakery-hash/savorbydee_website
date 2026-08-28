"use client";

import { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/**
 * Splash loading screen: shows the cake DotLottie animation for ~1.5s on
 * first load, then fades out. Overlays the page; pointer-events only while
 * visible so it never blocks interaction after it hides.
 */
export function SplashLoader() {
  const [visible, setVisible] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(false), 1500);
    const hideTimer = setTimeout(() => setHidden(true), 2100);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-500 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <DotLottieReact
        src="/Cake.lottie"
        loop
        autoplay
        className="h-40 w-40"
      />
    </div>
  );
}