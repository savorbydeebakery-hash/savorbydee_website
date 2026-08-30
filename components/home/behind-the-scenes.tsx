import { SmartImage } from "@/components/kinetic/smart-image";
import { SectionHead } from "@/components/home/section-head";

export interface BtsItem {
  id: string;
  label: string;
  caption?: string | null;
  image_url?: string | null;
}

/**
 * Behind the Scenes — the work rather than the product.
 *
 * Rows arrive from the behind_the_scenes table with their labels already
 * seeded (Prep work / Baking / Taking pictures) and no images. Only rows that
 * HAVE an image render, and the section hides completely when none do, so the
 * empty slots are visible to Dee in the admin panel and invisible to
 * customers until she has uploaded a photograph.
 *
 * No placeholder imagery by design. A stock kitchen shot or a finished-cake
 * photo captioned "Prep work" would be a claim about how this bakery works
 * that happens not to be true.
 *
 * Server component — nothing here is interactive.
 */
export function BehindTheScenes({ items }: { items: BtsItem[] }) {
  const withPhotos = (items ?? []).filter((i) => i.image_url);
  if (withPhotos.length === 0) return null;

  return (
    <section className="mx-auto mt-10 w-full max-w-[var(--bk-page-width)] px-4 md:mt-16 md:px-6">
      <SectionHead title="Behind the Scenes" />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        {withPhotos.map((item) => (
          <li key={item.id}>
            <div className="overflow-hidden rounded-[var(--bk-r-block)] bg-bk-bg-3">
              <SmartImage
                src={item.image_url}
                alt={item.label}
                aspect="aspect-[4/5]"
                sizes="(max-width: 640px) 92vw, 33vw"
                fit="cover"
                className="rounded-[var(--bk-r-block)] bg-bk-bg-3"
              />
            </div>
            <h3 className="mt-3 text-base font-semibold text-bk-fg md:text-lg">
              {item.label}
            </h3>
            {item.caption && (
              <p className="mt-1 text-sm leading-relaxed text-bk-muted">
                {item.caption}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
