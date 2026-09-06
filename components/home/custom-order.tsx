import { PhotoLinkCard } from "@/components/home/photo-link-card";

/**
 * Custom Order.
 *
 * This was the right half of a Full Menu | Custom Order split. The left half
 * went when Preorder became the whole catalogue — a "Full Menu" panel next to
 * a Preorder tab that opens the same 76 items was the same destination twice,
 * and the tab strip and footer already link there.
 *
 * Now the same photo card as the two menus, on the client's instruction, and
 * through the same component rather than a copy of its markup: three cards
 * that are meant to look like one object have to be one object in the code, or
 * the third quietly drifts from the other two.
 *
 * Wider than it is tall on desktop, and full width — a custom cake is the
 * third way to order, not a third of a row, and a single card in a two-column
 * grid reads as something that failed to load.
 */
export function CustomOrder({
  noticeDays,
  imageUrl,
}: {
  noticeDays: number;
  /** site_settings.custom_order_image_url, else a gallery fallback. */
  imageUrl?: string | null;
}) {
  return (
    <section className="mx-auto mt-8 w-full max-w-[var(--bk-page-width)] px-4 md:mt-14 md:px-6">
      <h2 className="bk-section-title text-bk-fg">Something of your own</h2>
      <p className="mt-2 max-w-2xl text-sm text-bk-muted md:text-base">
        Tell us the flavours, the design and the occasion, and we will bake it to order.
      </p>

      <div className="mt-5 md:mt-7">
        <PhotoLinkCard
          href="/custom-cake"
          title="Custom Order"
          blurb="A cake designed around your occasion, quoted individually."
          imageUrl={imageUrl}
          // "Up to", and staff confirm if it is sooner — the client was
          // specific about this wording, because quoting a flat five days
          // loses orders that could in fact be baked in two.
          meta={`Up to ${noticeDays} days' notice`}
          sizes="(max-width: 768px) 92vw, 1400px"
          aspect="aspect-[4/3] md:aspect-[21/9]"
        />
      </div>
    </section>
  );
}
