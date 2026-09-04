"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/kinetic/reveal";
import { SmartImage } from "@/components/kinetic/smart-image";
import { MagicCard } from "@/components/magicui/magic-card";
import { BorderBeam } from "@/components/magicui/border-beam";

interface TilePhoto {
  id: string;
  image_url: string;
  caption?: string | null;
}

interface HomeTilesProps {
  galleryPhotos: TilePhoto[];
}

/**
 * Four entry points into the catalogue.
 *
 * Two changes from the previous version, both from looking at what it actually
 * rendered rather than what it was meant to:
 *
 * 1. Photos are `contain`, not `cover`. The gallery is phone photography with
 *    off-centre subjects, and cover was zooming so far in that a tile showed a
 *    disembodied piece of icing. The subject now survives.
 * 2. The copy sits BELOW the image on its own panel rather than on top of it.
 *    Text over an arbitrary photo has no contrast guarantee, and the scrim it
 *    needed was eating the picture.
 *
 * MagicCard gives each tile a cursor-tracked spotlight; the Specials tile also
 * carries a BorderBeam, since it is the time-limited one and deserves the eye.
 */
const TILES = [
  {
    href: "/menu?tag=daily",
    label: "Daily Menu",
    sub: "Fresh to order",
    key: 0,
    span: "sm:col-span-2",
    aspect: "aspect-[16/10]",
    sizes: "(max-width: 640px) 100vw, 700px",
  },
  {
    href: "/custom-cake",
    label: "Custom Order",
    sub: "Made just for you",
    key: 1,
    span: "",
    aspect: "aspect-[3/4]",
    sizes: "(max-width: 640px) 100vw, 340px",
  },
  {
    href: "/menu",
    label: "Preorder Menu",
    sub: "Everything we bake",
    key: 2,
    span: "",
    aspect: "aspect-[3/4]",
    sizes: "(max-width: 640px) 100vw, 340px",
  },
  {
    href: "/menu?tag=specials",
    label: "Specials",
    sub: "Seasonal treats",
    key: 3,
    span: "sm:col-span-2",
    aspect: "aspect-[16/10]",
    sizes: "(max-width: 640px) 100vw, 700px",
    beam: true,
  },
];

export function HomeTiles({ galleryPhotos }: HomeTilesProps) {
  const photos = galleryPhotos.length >= 4 ? galleryPhotos : [];
  const pick = (i: number) => photos[i % photos.length]?.image_url ?? undefined;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:gap-6">
        {TILES.map((tile) => (
          <RevealItem key={tile.key} className={tile.span}>
            <Link href={tile.href} className="group block h-full">
              <MagicCard
                gradientSize={260}
                gradientFrom="var(--berry)"
                gradientTo="var(--blush)"
                gradientOpacity={0.14}
                className="flex h-full flex-col rounded-[var(--r-lg)] border border-ink/8 bg-porcelain p-0 shadow-[var(--shadow-sm)] transition-shadow duration-300 group-hover:shadow-[var(--shadow-lg)]"
              >
                <div className={`relative ${tile.aspect} overflow-hidden rounded-t-[var(--r-lg)] bg-shell`}>
                  <SmartImage
                    src={pick(tile.key)}
                    alt={tile.label}
                    aspect="h-full w-full"
                    sizes={tile.sizes}
                    fit="contain"
                    className="h-full rounded-none bg-shell"
                  />
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 p-5">
                  <div>
                    <p className="text-eyebrow text-berry">{tile.sub}</p>
                    <h3 className="font-display mt-1 text-xl font-semibold text-ink sm:text-2xl">
                      {tile.label}
                    </h3>
                  </div>
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cocoa text-shell transition-transform duration-300 group-hover:translate-x-1">
                    <ArrowRight size={16} />
                  </span>
                </div>

                {tile.beam && (
                  <BorderBeam size={90} duration={9} className="opacity-70" />
                )}
              </MagicCard>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
