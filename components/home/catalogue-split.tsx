import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHead } from "@/components/home/section-head";

interface MenuCategory {
  id: string;
  name: string;
}

/**
 * Full Menu | Custom Order — the second 50/50 row, same grid rules as
 * MenuSplit so the two sections line up down the page.
 *
 * Neither half is a product grid. Repeating the card grid a second time is
 * what made the old homepage read as one long template, and these two panels
 * are answering a different question anyway: not "what shall I buy" but
 * "where do I go next". So the left half is the category index and the right
 * half is a single decision.
 *
 * This is a server component — nothing here is interactive beyond links, and
 * keeping it off the client bundle costs nothing.
 */
export function CatalogueSplit({
  categories,
  itemCount,
  noticeDays,
}: {
  categories: MenuCategory[];
  /** Live count, so the panel never claims a catalogue size it does not have. */
  itemCount: number;
  /** From site_settings, not hardcoded — the client changes this in admin. */
  noticeDays: number;
}) {
  return (
    <section className="mx-auto mt-8 w-full max-w-[var(--bk-page-width)] px-4 md:mt-14 md:px-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* ---------- Full Menu ---------- */}
        <div className="flex flex-col rounded-[var(--bk-r-block)] border border-bk-border bg-bk-bg p-4 md:p-6">
          <SectionHead title="Full Menu" href="/menu" />
          <p className="-mt-1 mb-4 text-sm leading-relaxed text-bk-muted md:mb-5">
            {itemCount > 0
              ? `Everything we bake, ${itemCount} items across ${categories.length} categories.`
              : "Everything we bake, in one place."}
          </p>

          {categories.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/menu?category=${encodeURIComponent(c.id)}`}
                    className="inline-flex items-center rounded-[var(--bk-r-pill)] border border-bk-border bg-bk-bg-3 px-3.5 py-2 text-sm text-bk-fg transition-colors hover:border-bk-fg"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/menu"
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-[var(--bk-r-pill)] bg-bk-btn px-6 text-sm font-medium text-bk-btn-fg transition-opacity hover:opacity-85 md:mt-auto"
          >
            Browse the full menu
          </Link>
        </div>

        {/* ---------- Custom Order ----------
            Text only. This half is a single decision, not a browse, so it does
            not need a picture to make the point — and the one it carried was
            pulled from the gallery, which meant it advertised a cake we had
            already baked for somebody else on the panel asking you to design
            your own. The two halves still finish level: the grid stretches
            them and md:mt-auto pins both CTAs to the bottom edge. */}
        <div className="flex flex-col overflow-hidden rounded-[var(--bk-r-block)] border border-bk-border bg-bk-pink-soft p-4 md:p-6">
          <SectionHead title="Custom Order" href="/custom-cake" linkLabel="Enquire" />
          <p className="-mt-1 mb-4 text-sm leading-relaxed text-bk-muted md:mb-5">
            Tell us the flavours, the design and the occasion, and we will bake
            it to order. Custom cakes need {noticeDays} days notice.
          </p>

          <Link
            href="/custom-cake"
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--bk-r-pill)] bg-bk-btn px-6 text-sm font-medium text-bk-btn-fg transition-opacity hover:opacity-85 md:mt-auto"
          >
            Start your inquiry <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
