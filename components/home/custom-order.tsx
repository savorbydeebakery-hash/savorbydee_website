import { PhotoLinkCard } from "@/components/home/photo-link-card";

/**
 * Custom Order.
 *
 * This was the right half of a Full Menu | Custom Order split. The left half
 * went when Preorder became the whole catalogue — a "Full Menu" panel next to
 * a Preorder tab that opens the same 76 items was the same destination twice,
 * and the tab strip and footer already link there.
 *
 * The same photo card as the two menus, on the client's instruction, and
 * through the same component rather than a copy of its markup.
 *
 * It was briefly a full-width 21:9 band, which was the wrong shape for the
 * photographs that go in it. Every cake in the gallery is shot upright on a
 * phone, so a wide band at the page's full width is both enormous — over 700px
 * tall on a desktop — and a crop through the middle of the cake, with the top
 * tier cut off. The card is now half the row and the same 16:10 as the menu
 * cards, which is the shape the photographs actually survive, with the copy
 * alongside it.
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
      <div className="grid items-center gap-5 md:grid-cols-2 md:gap-8">
        <div>
          <h2 className="bk-section-title text-bk-fg">Something of your own</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-bk-muted md:text-base">
            Tell us the flavours, the design and the occasion, and we will bake it to
            order. Custom cakes need up to {noticeDays} days&rsquo; notice &mdash; we
            will let you know if yours can be ready sooner.
          </p>
        </div>

        <PhotoLinkCard
          href="/custom-cake"
          title="Custom Order"
          blurb="A cake designed around your occasion, quoted individually."
          imageUrl={imageUrl}
          // "Up to", and staff confirm if it is sooner — the client was
          // specific about this wording, because quoting a flat five days
          // loses orders that could in fact be baked in two.
          meta={`Up to ${noticeDays} days' notice`}
        />
      </div>
    </section>
  );
}
