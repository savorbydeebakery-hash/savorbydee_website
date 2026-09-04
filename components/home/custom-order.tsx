import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHead } from "@/components/home/section-head";

/**
 * Custom Order.
 *
 * This was the right half of a Full Menu | Custom Order split. The left half
 * went when Preorder became the whole catalogue — a "Full Menu" panel next to
 * a Preorder tab that opens the same 76 items was the same destination twice,
 * and the tab strip and footer already link there.
 *
 * Full width rather than a lonely half, so the row does not read as something
 * that failed to load.
 */
export function CustomOrder({ noticeDays }: { noticeDays: number }) {
  return (
    <section className="mx-auto mt-8 w-full max-w-[var(--bk-page-width)] px-4 md:mt-14 md:px-6">
      <div className="rounded-[var(--bk-r-block)] border border-bk-border bg-bk-pink-soft p-5 md:p-8">
        <SectionHead title="Custom Order" href="/custom-cake" linkLabel="Enquire" />

        <p className="-mt-1 max-w-2xl text-sm leading-relaxed text-bk-muted md:text-base">
          Tell us the flavours, the design and the occasion, and we will bake it
          to order. Custom cakes need up to {noticeDays} days&rsquo; notice, often less.
        </p>

        <Link
          href="/custom-cake"
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[var(--bk-r-pill)] bg-bk-btn px-7 text-sm font-medium text-bk-btn-fg transition-opacity hover:opacity-85"
        >
          Start your inquiry <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
