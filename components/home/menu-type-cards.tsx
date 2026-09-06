import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SmartImage } from "@/components/kinetic/smart-image";

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
          <Link
            key={card.href}
            href={card.href}
            className="group relative block overflow-hidden rounded-[var(--bk-r-block)] bg-bk-bg-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg focus-visible:ring-offset-2"
          >
            <SmartImage
              src={card.imageUrl}
              alt=""
              aspect="aspect-[4/3] md:aspect-[16/10]"
              sizes="(max-width: 768px) 92vw, 700px"
              priority={i === 0}
              fit="cover"
              className="rounded-none transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />

            {/* The scrim is what makes the title legible. Without it the copy
                sits on whatever the photograph happens to be — these are phone
                photos of iced cakes, so the bottom of the frame is as often
                white as it is dark, and a fixed text colour fails on half of
                them. Sized to cover the copy block, not the whole image. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/60 to-transparent"
            />

            <div
              data-contrast-ground="cocoa"
              className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-7"
            >
              <div>
                <h3 className="text-xl font-semibold text-white md:text-2xl">{card.title}</h3>
                <p className="mt-1 max-w-[28ch] text-sm leading-snug text-white/95">
                  {card.blurb}
                </p>
                {card.count != null && card.count > 0 && (
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-white/80">
                    {card.count} {card.count === 1 ? "item" : "items"}
                  </p>
                )}
              </div>
              <span className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-white/95 text-bk-fg transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                <ArrowRight size={19} aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
