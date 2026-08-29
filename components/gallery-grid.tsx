"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Gallery grid + full-size lightbox.
 *
 * The grid is CSS columns rather than a square grid. A square grid has to crop
 * every photo to fit, which is what was cutting the cakes off; columns let each
 * image keep its own aspect ratio, so nothing is cropped in the grid at all.
 *
 * The lightbox requests `resize=contain` instead of the loader's default
 * `cover`, so the full frame is shown rather than a filled box. It is fetched
 * at a large width only when opened, so browsing the grid never pays for it.
 */

export interface GalleryItem {
  src: string;
  alt: string;
  caption?: string | null;
}

const RENDER = "/storage/v1/render/image/public/";
const OBJECT = "/storage/v1/object/public/";

/** Full-frame version of a Supabase image. `contain` never crops. */
function fullSize(src: string, width = 1600) {
  if (!src.includes(OBJECT) && !src.includes(RENDER)) return src;
  const base = src.includes(OBJECT) ? src.replace(OBJECT, RENDER) : src.split("?")[0];
  return `${base}?width=${width}&quality=82&resize=contain`;
}

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setOpen((i) => (i === null ? null : (i + dir + items.length) % items.length)),
    [items.length]
  );

  // Keyboard control, and lock body scroll while the lightbox is up so the
  // page behind does not move under it.
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, step]);

  if (items.length === 0) return null;
  const active = open === null ? null : items[open];

  return (
    <>
      {/* Columns, not a grid: every photo keeps its own aspect ratio. */}
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4 [&>*]:mb-3 sm:[&>*]:mb-4">
        {items.map((item, i) => (
          <button
            key={`${item.src}-${i}`}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`View ${item.caption || item.alt} full size`}
            className="group relative block w-full break-inside-avoid overflow-hidden rounded-[var(--r-md)] bg-shell focus:outline-none focus-visible:ring-2 focus-visible:ring-berry focus-visible:ring-offset-2"
          >
            <Image
              src={item.src}
              alt={item.alt}
              width={600}
              height={0}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
              className="h-auto w-full transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              style={{ height: "auto" }}
            />
            {item.caption && (
              <span
                data-contrast-ground="cocoa"
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-cocoa/95 via-cocoa/55 to-transparent p-3 pt-9 text-left text-xs font-medium text-shell opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              >
                {item.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption || active.alt}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-cocoa/95 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-full bg-shell/10 p-2.5 text-shell transition-colors hover:bg-shell/20"
          >
            <X size={22} />
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-3 z-10 rounded-full bg-shell/10 p-3 text-shell transition-colors hover:bg-shell/20 sm:left-6"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-3 z-10 rounded-full bg-shell/10 p-3 text-shell transition-colors hover:bg-shell/20 sm:right-6"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullSize(active.src)}
            alt={active.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] rounded-[var(--r-md)] object-contain shadow-[0_40px_120px_-30px_rgb(0_0_0_/_0.7)]"
          />

          {active.caption && (
            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-cocoa/80 px-4 py-1.5 text-sm text-shell">
              {active.caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
