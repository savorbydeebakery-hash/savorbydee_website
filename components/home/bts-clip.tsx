"use client";

import { useEffect, useState } from "react";

/**
 * One Behind the Scenes clip.
 *
 * WHY THIS IS NOT PURELY CSS
 * The first version hid the video under `prefers-reduced-motion: reduce` and
 * showed the poster instead. That is right for decoration and wrong here: this
 * section IS short clips of the work, so hiding them leaves those visitors
 * with three still photographs and no way to reach what everyone else sees.
 * And the preference is far more common than it looks — Windows' "Animation
 * effects" switch, which plenty of people turn off for performance, is
 * reported to the browser as reduced motion. The client's own machine has it
 * off, which is how this was found: the clips looked broken.
 *
 * So the preference changes HOW the clip is offered, not whether it exists:
 *   no-preference — muted, looped, autoplaying, no controls. Ambient.
 *   reduce        — the poster frame, still, with the browser's own controls
 *                   so it plays on a deliberate tap and stops at the end.
 *
 * Muted either way: a browser blocks autoplay with sound, so an unmuted clip
 * would simply never start.
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
  // Starts false so the server and the first client render agree; a visitor
  // who wants reduced motion gets the controls a frame later, having seen a
  // poster either way.
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <video
      // key forces a fresh element when the preference flips, because autoPlay
      // is only honoured on a newly created element.
      key={reduced ? "static" : "ambient"}
      autoPlay={!reduced}
      loop={!reduced}
      controls={reduced}
      muted
      playsInline
      preload="metadata"
      poster={posterUrl ?? undefined}
      aria-label={label}
      className="aspect-[4/5] w-full rounded-[var(--bk-r-block)] bg-bk-bg-3 object-cover"
    >
      <source src={videoUrl} type="video/mp4" />
    </video>
  );
}
