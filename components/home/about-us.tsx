import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHead } from "@/components/home/section-head";

/**
 * About Us — the last section on the homepage.
 *
 * The copy is the paragraph that used to sit under the hero headline. It reads
 * better here: in the hero it competed with the headline and the product shot
 * for the same glance, and a 48-word paragraph is not something anyone reads
 * in the first two seconds of a page.
 *
 * Driven by site_settings.about_narrative so Dee can rewrite it in Admin ->
 * Settings without a deploy. That column is currently an empty string, which
 * is why the fallback exists rather than the section rendering blank.
 */
const FALLBACK =
  "At our artisanal bakery, we don’t just bake — we craft edible art. From fluffy brioche buns that pull apart like clouds to decadent cakes layered with luxury, each creation is handmade with passion, precision, and a sprinkle of magic.";

export function AboutUs({ narrative }: { narrative?: string | null }) {
  const copy = narrative?.trim() || FALLBACK;

  return (
    <section className="mx-auto mt-10 w-full max-w-[var(--bk-page-width)] px-4 md:mt-16 md:px-6">
      <SectionHead title="About Us" />

      <div className="rounded-[var(--bk-r-block)] bg-bk-pink-soft px-5 py-8 md:px-12 md:py-12">
        {/* Measure capped around 65ch — the paragraph is the whole section, so
            it gets the line length of something meant to be read. */}
        <p className="max-w-[62ch] text-base leading-[1.7] text-bk-fg md:text-lg">
          {copy}
        </p>

        <Link
          href="/about"
          className="mt-7 inline-flex h-11 items-center gap-2 rounded-[var(--bk-r-pill)] bg-bk-btn px-6 text-sm font-medium text-bk-btn-fg transition-opacity hover:opacity-85"
        >
          Our story <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
