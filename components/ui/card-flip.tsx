"use client";

import { useState, type ReactNode } from "react";

/**
 * A card that turns over to show its description.
 *
 * The card is as tall as its front until someone turns it. The back used to
 * share the grid cell all the time so the card never resized, but a long
 * description then stretched the card, and with it the row, leaving hundreds of
 * empty pixels under short cards (client, 2026-11-04). Now the back only takes
 * up room while it is showing, so the card grows when tapped and not before.
 *
 * The back's contents aren't built until someone first turns the card. A menu page has
 * nearly a hundred cards, and hardly any get turned, so this made every page heavier to
 * build for nothing. Its data still arrives with the page, so it opens at once.
 *
 * The hidden face is `inert` as well as visually hidden. `backface-visibility`
 * only stops it being painted: without `inert` a screen reader still reads the
 * description of a card that is showing its front, and Tab still lands on the
 * button behind it. Both faces are always in the DOM — that is what lets the
 * browser animate between them — so hiding one is an explicit job.
 *
 * With reduced motion the faces swap without the rotation. The information is
 * the point; the spin is decoration.
 *
 * SAFARI: the face turned away is also made `invisible`, switched at the
 * half-way point of the turn (250ms of 500ms), when the card is edge-on and
 * neither face shows. WebKit ignores `backface-visibility` for anything
 * inside a face that gets its own compositing layer (the photo, the zoom
 * lens, rounded clipping), so on a Mac "View description" turned the card
 * but the photo side kept painting over the description. Cards without a
 * photo worked, which is how it was reported (2026-11-01).
 */
const SWAP = "[transition:visibility_0s_linear_250ms] motion-reduce:[transition:none]";
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
  const [opened, setOpened] = useState(flipped);
  if (flipped && !opened) setOpened(true);

  return (
    <div className={`h-full [perspective:1200px] ${className}`}>
      <div
        className={`relative grid h-full transform-3d transition-transform duration-500 ease-[var(--ease-out)] motion-reduce:transition-none ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        <div
          data-card-face="front"
          className={`col-start-1 row-start-1 backface-hidden ${SWAP} ${flipped ? "invisible" : "visible"}`}
          inert={flipped}
          aria-hidden={flipped}
        >
          {front}
        </div>
        <div
          data-card-face="back"
          className={`rotate-y-180 backface-hidden ${SWAP} ${flipped ? "visible col-start-1 row-start-1" : "invisible absolute inset-0"}`}
          inert={!flipped}
          aria-hidden={!flipped}
        >
          {opened ? back : null}
        </div>
      </div>
    </div>
  );
}
