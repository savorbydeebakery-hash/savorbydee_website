import { SmartImage } from "@/components/kinetic/smart-image";
import { BtsClip } from "@/components/home/bts-clip";
import { BTS_ASPECT } from "@/components/home/bts-aspect";

import { SectionHead } from "@/components/home/section-head";

export interface BtsItem {
  id: string;
  label: string;
  caption?: string | null;
  /** The photograph — and the poster frame when there is a clip. */
  image_url?: string | null;
  /** Short muted clip, looped. Migration 00044. */
  video_url?: string | null;
}

/**
 * Behind the Scenes — the work rather than the product.
 *
 * Only stages with a photograph or clip are shown. One without is left out
 * until Dee uploads to it in Admin -> Behind the Scenes, and with none the
 * section is hidden. It used to show a "Photo coming soon" tile, which the
 * client asked to remove (2026-11-01).
 *
 * A stage can hold a short clip instead of a photograph, which is what the
 * client asked for in the first place: the work here is icing a bun and
 * pulling a tray out of the oven, and neither reads as work in a still.
 *
 * The clips are muted, looped and play inline, and carry the photograph as
 * their poster so a tile is never empty while one loads. They autoplay under
 * reduced motion too — see components/home/bts-clip.tsx for why.
 *
 * Both the caption and the stage label are gone from the page, so this is
 * three tiles under one heading rather than a labelled diagram of the process.
 *
 * Both fields stay in the database and the admin panel: the label is how Dee
 * tells the three slots apart when uploading, and it is still what the image
 * carries as alt text, which is the only description a screen reader gets now
 * that nothing is printed beneath it.
 */

export function BehindTheScenes({ items }: { items: BtsItem[] }) {
  const stages = (items ?? []).filter((item) => item.image_url || item.video_url);
  if (stages.length === 0) return null;

  return (
    <section className="mx-auto mt-10 w-full max-w-[var(--bk-page-width)] px-4 md:mt-16 md:px-6">
      <SectionHead title="Behind the Scenes" />

      {/* Same size as the "Two ways to order" cards above (PhotoLinkCard): one
          per row on a phone, two from md, 4:3 then 16:10. The clips were 4:5
          and stacked three tall, a 1,500px section on a phone (client,
          2026-10-31). An odd last tile is centred at the same width. */}
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {stages.map((item, i) => {
          return (
            // On a phone the second stage leads: the client wants the oven
            // clip first when the tiles stack. Positional, not by label, so
            // it follows whatever Dee sets as sort_order; from sm up the
            // three sit side by side in database order.
            <li
              key={item.id}
              className={`${i === 1 ? "max-md:order-first" : ""} md:last:odd:col-span-2 md:last:odd:mx-auto md:last:odd:w-[calc(50%-0.625rem)]`}
            >
              <div className="overflow-hidden rounded-[var(--bk-r-block)] bg-bk-bg-3">
                {item.video_url ? (
                  <BtsClip
                    videoUrl={item.video_url}
                    posterUrl={item.image_url}
                    label={item.label}
                  />
                ) : (
                  <SmartImage
                    src={item.image_url}
                    alt={item.label}
                    aspect={BTS_ASPECT}
                    sizes="(max-width: 768px) 92vw, 50vw"
                    fit="cover"
                    className="rounded-[var(--bk-r-block)] bg-bk-bg-3"
                  />
                )}
              </div>

            </li>
          );
        })}
      </ul>
    </section>
  );
}
