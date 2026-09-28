"use client";

import { useEffect, useRef } from "react";

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

  useEffect(() => {
    ref.current?.play().catch(() => {});
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={posterUrl ?? undefined}
      aria-label={label}
      className="aspect-[4/5] w-full rounded-[var(--bk-r-block)] bg-bk-bg-3 object-cover"
    >
      <source src={videoUrl} type="video/mp4" />
    </video>
  );
}
