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

const TILES = [
  { href: "/menu?tag=daily", label: "Daily Menu", sub: "Fresh to order", key: 0 },
  { href: "/custom-cake", label: "Custom Order", sub: "Made just for you", key: 1 },
  { href: "/menu", label: "Full Menu", sub: "Everything we bake", key: 2 },
  { href: "/menu?tag=specials", label: "Specials", sub: "Seasonal treats", key: 3 },
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
      <RevealGroup className="grid grid-cols-2 gap-6 lg:gap-8">
        {TILES.map((tile) => (
          <RevealItem key={tile.key}>
            <Link
              href={tile.href}
              className="group relative block aspect-[4/3] overflow-hidden rounded-[16px]"
            >
              <div className="absolute inset-0">
                <SmartImage
                  src={pick(tile.key)}
                  alt={tile.label}
                  aspect="aspect-[4/3]"
                  sizes="(max-width: 640px) 50vw, 560px"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-white/80">
                  {tile.sub}
                </p>
                <h3 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                  {tile.label}
                </h3>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-pink px-3 py-1 text-xs font-semibold text-ink transition-transform group-hover:gap-2">
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