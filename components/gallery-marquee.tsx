"use client";

import type { CSSProperties } from "react";
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
 * Infinite auto-scroll marquee. Renders nothing when empty.
 * Track is duplicated 3x and translated via CSS keyframes for a seamless loop.
 * Pauses on hover / focus. Duplicated items are hidden from a11y tree.
 */
export function GalleryMarquee({ photos }: GalleryMarqueeProps) {
  if (!photos || photos.length === 0) return null;

  // Cap the source before duplicating: the track is rendered 3x for a seamless
  // loop, so every extra photo costs three DOM nodes. 12 is more than enough to
  // fill the viewport at 288px per tile.
  const loopCount = 3;
  const source = photos.slice(0, 12);
  const track: GalleryPhoto[] = Array.from({ length: loopCount }, () => source).flat();

  return (
    <Reveal>
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
                aria-hidden={i >= source.length}
              >
                <SmartImage
                  src={photo.image_url}
                  alt={i < source.length ? (photo.caption ?? "SAVOR bakery") : ""}
                  aspect="aspect-[16/10]"
                  sizes="288px"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}