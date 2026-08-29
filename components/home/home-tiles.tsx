"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/kinetic/reveal";
import { SmartImage } from "@/components/kinetic/smart-image";

interface TilePhoto {
  id: string;
  image_url: string;
  caption?: string | null;
}

interface HomeTilesProps {
  galleryPhotos: TilePhoto[];
}

/**
 * Asymmetric bento rather than a flat 2x2 — a symmetrical grid of four equal
 * tiles is the single most template-looking layout there is. Tile 1 and 4 span
 * two columns; 2 and 3 stack beside them.
 */
const TILES = [
  { href: "/menu?tag=daily", label: "Daily Menu", sub: "Fresh to order", key: 0,
    span: "sm:col-span-2", aspect: "aspect-[16/10]", sizes: "(max-width: 640px) 100vw, 740px" },
  { href: "/custom-cake", label: "Custom Order", sub: "Made just for you", key: 1,
    span: "", aspect: "aspect-[4/5]", sizes: "(max-width: 640px) 100vw, 366px" },
  { href: "/menu", label: "Full Menu", sub: "Everything we bake", key: 2,
    span: "", aspect: "aspect-[4/5]", sizes: "(max-width: 640px) 100vw, 366px" },
  { href: "/menu?tag=specials", label: "Specials", sub: "Seasonal treats", key: 3,
    span: "sm:col-span-2", aspect: "aspect-[16/10]", sizes: "(max-width: 640px) 100vw, 740px" },
];

/**
 * Four big cinematic image tiles (Daily / Custom / Full / Specials),
 * replacing the small category quick-links. Mobile stacks to 1-col.
 */
export function HomeTiles({ galleryPhotos }: HomeTilesProps) {
  const photos = galleryPhotos.length >= 4 ? galleryPhotos : [];
  const pick = (i: number) =>
    photos[i % photos.length]?.image_url ?? undefined;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* 2x2 symmetrical grid, ~16px radius, ~24px gaps */}
      <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:gap-6">
        {TILES.map((tile) => (
          <RevealItem key={tile.key} className={tile.span}>
            <Link
              href={tile.href}
              className={`group relative block ${tile.aspect} overflow-hidden rounded-[var(--r-xl)]`}
            >
              {/* Image scales inside a fixed frame — the frame stays put, which
                  is the bit that reads as expensive. */}
              <div className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.06] motion-reduce:group-hover:scale-100">
                <SmartImage
                  src={pick(tile.key)}
                  alt={tile.label}
                  aspect="h-full w-full"
                  sizes={tile.sizes}
                  className="h-full rounded-none"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-cocoa/85 via-cocoa/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <p className="text-eyebrow text-blush">{tile.sub}</p>
                <h3 className="font-display mt-1 text-2xl font-semibold text-shell sm:text-3xl">
                  {tile.label}
                </h3>
                <span className="glass glass-sheen mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-all group-hover:gap-2.5">
                  Order Now <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}