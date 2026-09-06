"use client";

import type { ReactNode } from "react";

/**
 * A card that turns over to show its description.
 *
 * Both faces occupy the same grid cell, so the container is as tall as the
 * taller of the two and the card does not resize as it turns — a card that
 * grew mid-flip would shove every card below it down the page.
 *
 * The hidden face is `inert` as well as visually hidden. `backface-visibility`
 * only stops it being painted: without `inert` a screen reader still reads the
 * description of a card that is showing its front, and Tab still lands on the
 * button behind it. Both faces are always in the DOM — that is what lets the
 * browser animate between them — so hiding one is an explicit job.
 *
 * With reduced motion the faces swap without the rotation. The information is
 * the point; the spin is decoration.
 */
export function CardFlip({
  flipped,
  front,
  back,
  className = "",
}: {
  flipped: boolean;
  front: ReactNode;
  back: ReactNode;
  className?: string;
}) {
  return (
    <div className={`h-full [perspective:1200px] ${className}`}>
      <div
        className={`grid h-full transform-3d transition-transform duration-500 ease-[var(--ease-out)] motion-reduce:transition-none ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        <div
          data-card-face="front"
          className="col-start-1 row-start-1 backface-hidden"
          inert={flipped}
          aria-hidden={flipped}
        >
          {front}
        </div>
        <div
          data-card-face="back"
          className="col-start-1 row-start-1 rotate-y-180 backface-hidden"
          inert={!flipped}
          aria-hidden={!flipped}
        >
          {back}
        </div>
      </div>
    </div>
  );
}
