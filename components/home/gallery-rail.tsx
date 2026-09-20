"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion/gsap";
import { getScrollVelocity } from "@/lib/motion/scroll-velocity";
import { SectionHead } from "@/components/home/section-head";

interface GalleryPhoto {
  id: string;
  image_url: string;
  caption?: string | null;
}

/**
 * "Our Gallery" — a continuously scrolling strip of photographs, full-bleed on
 * phones the way Little Token's is (it breaks its own 16px gutter with -mx-4)
 * and contained on desktop.
 *
 * FREE-FORM SIZING
 * The old marquee forced every photo into a fixed 288x176 box at aspect-[16/10]
 * with object-cover, so a portrait shot of a tall cake was centre-cropped down
 * to a band of icing. Here the ROW height is fixed and the WIDTH is whatever
 * that photo's own aspect ratio asks for, so a portrait tile is narrow, a
 * panorama is wide, and nothing is cropped.
 *
 * The ratio has to come from the file, and gallery_photos stores no dimensions,
 * so each tile measures itself on load and remembers the result. Until it does
 * it holds 4/3 — chosen because it is the mode of this bakery's library, so
 * most tiles never visibly resize. The measurement is keyed by URL and shared
 * across the duplicated loop copies, so each distinct photo settles once.
 */

const LOOP = 3;

/**
 * Free-form does not mean unbounded. A 4000px-tall panorama at a fixed row
 * height is a 20px sliver nobody can see, and a very wide one pushes every
 * other photo off the rail. Portrait 2:3 through landscape 2:1 covers real
 * photography; anything beyond gets clamped and cropped by object-cover.
 */
const MIN_RATIO = 0.62;
const MAX_RATIO = 2;
const clampRatio = (r: number) => Math.min(MAX_RATIO, Math.max(MIN_RATIO, r));

export function GalleryRail({
  photos,
  handle = "@savorbydee",
}: {
  photos: GalleryPhoto[];
  handle?: string;
}) {
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const rail = useRef<HTMLDivElement>(null);

  /**
   * The rail leans into the scroll.
   *
   * Scroll speed, not scroll position: the strip already travels on its own,
   * so tying it to position would only fight the marquee. Leaning it by
   * velocity means the gallery reacts to how the visitor is moving — a flick
   * down tilts and stretches it, and it settles back the moment they stop.
   * That is the whole of "alive while scrolling" in one gesture, and it costs
   * two compositor properties on one element.
   *
   * The skew goes on the WRAPPER, never the track: the track's transform is
   * the CSS marquee's, and a second writer on that property would stutter it.
   *
   * Reduced motion gets nothing, twice over — this block is inside matchMedia,
   * and the velocity source is zero unless Lenis is running, which it is not
   * for those visitors.
   */
  useGSAP(
    () => {
      const el = rail.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const setSkew = gsap.quickSetter(el, "skewY", "deg");
        const setScale = gsap.quickSetter(el, "scaleX");
        let eased = 0;

        const tick = () => {
          // Lerped rather than applied raw: the raw signal is per-frame and
          // jittery, and the lag is what makes it read as weight.
          eased += (getScrollVelocity() - eased) * 0.08;
          const clamped = gsap.utils.clamp(-18, 18, eased);
          setSkew(clamped * 0.09);
          setScale(1 + Math.abs(clamped) * 0.0016);
        };

        gsap.ticker.add(tick);
        return () => {
          gsap.ticker.remove(tick);
          gsap.set(el, { clearProps: "transform" });
        };
      });

      return () => mm.revert();
    },
    { scope: rail }
  );

  const measure = useCallback((url: string, w: number, h: number) => {
    if (!w || !h) return;
    setRatios((prev) =>
      prev[url] ? prev : { ...prev, [url]: clampRatio(Number((w / h).toFixed(4))) }
    );
  }, []);

  if (!photos || photos.length === 0) return null;

  const source = photos.slice(0, 14);
  const track = Array.from({ length: LOOP }, () => source).flat();

  return (
    <section className="mt-8 md:mt-14">
      <div className="mx-auto w-full max-w-[var(--bk-page-width)] px-4 md:px-6">
        <SectionHead title="Our Gallery" handle={handle} href="/gallery" />
      </div>

      {/* Full-bleed. The rail is decorative motion, so it is hidden from the
          a11y tree wholesale and the real, ordered, keyboard-reachable gallery
          lives at /gallery — which the section header links to. */}
      <div
        ref={rail}
        className="relative overflow-hidden"
        aria-label="Photographs from the bakery"
      >
        <div
          className="marquee-track flex w-max gap-2 md:gap-3"
          style={{ ["--marquee-duration" as string]: "70s" }}
          onMouseEnter={(e) => e.currentTarget.classList.add("marquee-paused")}
          onMouseLeave={(e) => e.currentTarget.classList.remove("marquee-paused")}
        >
          {track.map((photo, i) => {
            const ratio = ratios[photo.image_url] ?? 4 / 3;
            return (
              <div
                key={`${photo.id}-${i}`}
                aria-hidden={i >= source.length}
                // Height is fixed by the row; width follows the photo.
                className="relative h-36 shrink-0 overflow-hidden rounded-[var(--bk-r-inner)] bg-bk-bg-3 sm:h-44 md:h-56"
                style={{ aspectRatio: String(ratio) }}
              >
                <Image
                  src={photo.image_url}
                  alt={i < source.length ? (photo.caption ?? "") : ""}
                  fill
                  // Sized off the tallest row (224px) at 2x DPR, across the
                  // plausible ratio range. A single value is right here because
                  // the box height never depends on the viewport.
                  sizes="384px"
                  className="object-cover"
                  onLoad={(e) =>
                    measure(
                      photo.image_url,
                      e.currentTarget.naturalWidth,
                      e.currentTarget.naturalHeight
                    )
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
