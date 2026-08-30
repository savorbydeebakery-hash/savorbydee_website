import { Utensils, Flame, Camera, ImageIcon } from "lucide-react";
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
 * Every active stage renders whether or not it has a photograph yet. A stage
 * without one gets a placeholder tile at the same aspect ratio, so the section
 * is visible and correctly proportioned now and each slot simply swaps to the
 * real image as Dee uploads it in Admin -> Behind the Scenes. Nothing about
 * the layout shifts when that happens.
 *
 * Labels only — the caption line under each stage was dropped, so the row
 * reads as three named steps rather than three paragraphs. The caption column
 * and its admin field are left in place so the copy is not lost and the line
 * can be switched back on without a migration.
 *
 * The placeholder is deliberately an icon on a tint that says "photo coming
 * soon" — not a stock kitchen shot and not a borrowed gallery photo. Either of
 * those would be showing customers a picture that is not this bakery's work
 * and captioning it as if it were.
 *
 * FALLBACK_STAGES covers the window before migration 00019 is applied, when
 * the query errors and no rows come back at all. Once the migration runs, the
 * table is the only source and these are never used.
 */

const FALLBACK_STAGES: BtsItem[] = [
  {
    id: "fallback-prep",
    label: "Prep work",
    caption: "Weighing, mixing and getting everything ready before the oven goes on.",
  },
  {
    id: "fallback-baking",
    label: "Baking",
    caption: "Nothing goes in until the order is placed. This is where it happens.",
  },
  {
    id: "fallback-photos",
    label: "Taking pictures",
    caption: "Every bake photographed before it leaves, so you see the real thing.",
  },
];

/** Matched on the seeded labels; falls back to a generic mark. */
function stageIcon(label: string) {
  const key = label.toLowerCase();
  if (key.includes("prep")) return Utensils;
  if (key.includes("bak")) return Flame;
  if (key.includes("pictur") || key.includes("photo")) return Camera;
  return ImageIcon;
}

export function BehindTheScenes({ items }: { items: BtsItem[] }) {
  const stages = items && items.length > 0 ? items : FALLBACK_STAGES;
  if (stages.length === 0) return null;

  return (
    <section className="mx-auto mt-10 w-full max-w-[var(--bk-page-width)] px-4 md:mt-16 md:px-6">
      <SectionHead title="Behind the Scenes" />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        {stages.map((item) => {
          const Icon = stageIcon(item.label);
          return (
            <li key={item.id}>
              <div className="overflow-hidden rounded-[var(--bk-r-block)] bg-bk-bg-3">
                {item.image_url ? (
                  <SmartImage
                    src={item.image_url}
                    alt={item.label}
                    aspect="aspect-[4/5]"
                    sizes="(max-width: 640px) 92vw, 33vw"
                    fit="cover"
                    className="rounded-[var(--bk-r-block)] bg-bk-bg-3"
                  />
                ) : (
                  <div
                    // Same aspect as the real photo, so nothing reflows when
                    // one is uploaded.
                    className="flex aspect-[4/5] flex-col items-center justify-center gap-3 bg-bk-pink-soft"
                  >
                    <Icon size={30} strokeWidth={1.5} className="text-bk-maroon" aria-hidden="true" />
                    {/* Full strength, not /70: at 70% this measured 4.06:1 on
                        the pink tint and 12px body text needs 4.5. Solid
                        --bk-maroon on --bk-pink-soft is 8.73:1. */}
                    <span className="text-xs font-medium uppercase tracking-wide text-bk-maroon">
                      Photo coming soon
                    </span>
                  </div>
                )}
              </div>

              <h3 className="mt-3 text-base font-semibold text-bk-fg md:text-lg">
                {item.label}
              </h3>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
