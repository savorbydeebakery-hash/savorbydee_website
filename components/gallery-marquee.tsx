"use client";

import { Reveal } from "@/components/kinetic/reveal";
import { SmartImage } from "@/components/kinetic/smart-image";

interface GalleryPhoto {
  id: string;
  image_url: string;
  caption?: string | null;
}

interface GalleryMarqueeProps {
  photos: GalleryPhoto[];
}

/**
 * Two counter-scrolling rows. A single row reads as a generic logo strip; two
 * moving against each other reads as designed and fills the dark band properly.
 *
 * Each row's track is duplicated 3x and translated by -33.333% for a seamless
 * loop. Duplicates are hidden from the a11y tree.
 *
 * The source list is capped before duplicating — every extra photo costs three
 * DOM nodes per row, and this used to be fed ~100 unbounded rows.
 */

const PER_ROW = 8;
const LOOP = 3;

function Row({
  photos,
  reverse = false,
  duration,
}: {
  photos: GalleryPhoto[];
  reverse?: boolean;
  duration: string;
}) {
  if (photos.length === 0) return null;
  const track = Array.from({ length: LOOP }, () => photos).flat();

  return (
    <div
      className={`marquee-track flex w-max gap-4 ${reverse ? "marquee-reverse" : ""}`}
      style={{ ["--marquee-duration" as string]: duration }}
      onMouseEnter={(e) => e.currentTarget.classList.add("marquee-paused")}
      onMouseLeave={(e) => e.currentTarget.classList.remove("marquee-paused")}
    >
      {track.map((photo, i) => (
        <div
          key={`${photo.id}-${i}`}
          className="h-44 w-72 flex-shrink-0 overflow-hidden rounded-[var(--r-md)]"
          aria-hidden={i >= photos.length}
        >
          <SmartImage
            src={photo.image_url}
            alt={i < photos.length ? (photo.caption ?? "SAVOR bakery") : ""}
            aspect="aspect-[16/10]"
            sizes="288px"
            className="rounded-[var(--r-md)]"
          />
        </div>
      ))}
    </div>
  );
}

export function GalleryMarquee({ photos }: GalleryMarqueeProps) {
  if (!photos || photos.length === 0) return null;

  const source = photos.slice(0, PER_ROW * 2);
  const topRow = source.slice(0, PER_ROW);
  const bottomRow = source.slice(PER_ROW) .length > 0 ? source.slice(PER_ROW) : topRow;

  return (
    <Reveal>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-h2 mb-8 text-shell">From the Bakery</h2>

        <div className="relative space-y-4 overflow-hidden">
          {/* Fade edges — cocoa, matching the dark band. */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-cocoa to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-cocoa to-transparent" />

          <Row photos={topRow} duration="52s" />
          <Row photos={bottomRow} duration="64s" reverse />
        </div>
      </section>
    </Reveal>
  );
}
