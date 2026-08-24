"use client";

import type { CSSProperties } from "react";

interface GalleryPhoto {
  id: string;
  image_url: string;
  caption?: string | null;
}

interface GalleryMarqueeProps {
  photos: GalleryPhoto[];
}

/**
 * Infinite auto-scroll marquee. Renders nothing when empty.
 * Track is duplicated 3x and translated via CSS keyframes for a seamless loop.
 * Pauses on hover / focus. Duplicated items are hidden from a11y tree.
 */
export function GalleryMarquee({ photos }: GalleryMarqueeProps) {
  if (!photos || photos.length === 0) return null;

  const loopCount = 3;
  const track: GalleryPhoto[] = Array.from({ length: loopCount }, () => photos).flat();

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h2 className="mb-6 text-2xl font-semibold text-ink">From the Bakery</h2>
      <div className="group relative overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />

        <div
          className="flex w-max gap-4 marquee-track"
          style={{ "--loop-count": loopCount } as CSSProperties}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).classList.add("marquee-paused")}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).classList.remove("marquee-paused")}
        >
          {track.map((photo, i) => (
            <div
              key={`${photo.id}-${i}`}
              className="h-48 w-72 flex-shrink-0 overflow-hidden rounded-2xl"
              aria-hidden={i >= photos.length}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.image_url}
                alt={i < photos.length ? (photo.caption ?? "SAVOR bakery") : ""}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}