"use client";

import { useEffect, useRef, useState } from "react";
import { BTS_ASPECT } from "@/components/home/bts-aspect";

/**
 * One Behind the Scenes clip: muted, looped, autoplaying, no controls.
 *
 * WHY REDUCED MOTION DOES NOT CHANGE THIS
 * Two earlier versions keyed off `prefers-reduced-motion: reduce` — first
 * hiding the clip behind its poster, then showing it with the browser's
 * controls so it played on a tap. The client asked for the clips to simply
 * play, everywhere. The preference is also far more common than it looks:
 * Windows' "Animation effects" switch and Android's "Remove animations" are
 * both reported as reduced motion, so on the client's own devices the section
 * looked like three paused videos with scrub bars. These are short silent
 * clips of the work, not decoration layered over content, so they play.
 *
 * Muted because a browser blocks autoplay with sound, so an unmuted clip would
 * never start. The explicit play() covers browsers that decline the autoPlay
 * attribute on first paint (iOS in Low Power Mode, some Android WebViews); if
 * that is refused too, the poster stays up, which is the same as before.
 *
 * WHY THEY WAIT UNTIL THEY'RE NEAR THE SCREEN
 * With autoPlay and preload="auto" every visitor downloaded every clip the moment
 * the homepage opened, whether or not they ever scrolled that far: the biggest
 * cost on the page on a phone connection. The file is now attached a little
 * before the clip scrolls into view and it plays while it is on screen.
 */
export function BtsClip({
  videoUrl,
  posterUrl,
  label,
}: {
  videoUrl: string;
  posterUrl?: string | null;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = setTimeout(() => setSrc(videoUrl), 0);
      return () => clearTimeout(id);
    }
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSrc(videoUrl);
      },
      { rootMargin: "400px" }
    );
    const onScreen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    near.observe(video);
    onScreen.observe(video);
    return () => {
      near.disconnect();
      onScreen.disconnect();
    };
  }, [videoUrl]);

  // A source added after the element exists needs an explicit load and play.
  useEffect(() => {
    const video = ref.current;
    if (!src || !video) return;
    video.load();
    video.play().catch(() => {});
  }, [src]);

  return (
    <video
      ref={ref}
      loop
      muted
      playsInline
      preload="none"
      poster={posterUrl ?? undefined}
      aria-label={label}
      className={`${BTS_ASPECT} w-full rounded-[var(--bk-r-block)] bg-bk-bg-3 object-cover`}
    >
      {src && <source src={src} type="video/mp4" />}
    </video>
  );
}
