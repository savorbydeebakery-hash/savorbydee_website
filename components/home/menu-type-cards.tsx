import { PhotoLinkCard } from "@/components/home/photo-link-card";

/**
 * The two menus, as two big photographs you tap.
 *
 * This replaced a tab strip over a grid of eight item tiles. That block asked
 * the visitor to choose a menu and choose an item in the same glance, and on a
 * phone the eight tiles pushed everything below them off the first two
 * screens. There are only ever two menus, so two cards say it without a
 * control to learn.
 *
 * The photographs are gallery shots, which is what the client asked for, and
 * they are chosen in admin rather than picked here. That matters: every
 * gallery image is a photograph of one particular bake, so whichever one is
 * used to stand for a whole menu is making a claim about it. A tier cake
 * fronting the preorder menu suggests the preorder menu is tier cakes, when it
 * is mostly tea cakes and cheesecakes. The client knows which photograph is
 * fair; this only has a default so the page is never blank.
 *
 * Server component on purpose — nothing here is interactive, and the images
 * are the largest thing on the homepage after the hero.
 */
export interface MenuTypeCard {
  href: string;
  title: string;
  blurb: string;
  imageUrl?: string | null;
  /** How many items the menu holds. Omitted rather than shown as 0. */
  count?: number;
}

export function MenuTypeCards({ cards }: { cards: MenuTypeCard[] }) {
  return (
    <section className="mx-auto mt-10 w-full max-w-[var(--bk-page-width)] px-4 md:mt-16 md:px-6">
      <h2 className="bk-section-title text-bk-fg">Two ways to order</h2>
      <p className="mt-2 max-w-2xl text-sm text-bk-muted md:text-base">
        Baked this morning, or made to order for the day you need it.
      </p>

      <div className="mt-5 grid gap-4 md:mt-7 md:grid-cols-2 md:gap-5">
        {cards.map((card, i) => (
          <PhotoLinkCard
            key={card.href}
            href={card.href}
            title={card.title}
            blurb={card.blurb}
            imageUrl={card.imageUrl}
            meta={
              card.count != null && card.count > 0
                ? `${card.count} ${card.count === 1 ? "item" : "items"}`
                : undefined
            }
            priority={i === 0}
          />
        ))}
      </div>
    </section>
  );
}
