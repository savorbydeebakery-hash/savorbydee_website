import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { MENU_TYPE_ORDER } from "@/components/home/menu-type-tabs";

/**
 * Getting back out of a menu page.
 *
 * The tab strip below already switches between menus, but there was no way
 * home from here except the header logo, which is not obvious as a control.
 * This adds an explicit Home, and repeats the other menus as pills — the tabs
 * read as a heading at their size, so a customer scrolling the bottom of a
 * 45-item list does not necessarily connect them with navigation.
 *
 * `current` is the slug of the page this sits on, so it is never a link to
 * where you already are. Pass nothing on the combined /menu page, where both
 * menus are worth offering.
 */
export function MenuPageNav({ current }: { current?: string }) {
  const others = MENU_TYPE_ORDER.filter((m) => m.slug !== current);

  return (
    <nav
      aria-label="Menu navigation"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <Link
        href="/"
        className="inline-flex h-10 items-center gap-1.5 rounded-[var(--bk-r-pill)] border border-bk-border px-4 text-sm font-medium text-bk-fg transition-colors hover:border-bk-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg focus-visible:ring-offset-2"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Home
      </Link>

      <ul className="flex flex-wrap items-center gap-2">
        {others.map(({ slug, label, href }) => (
          <li key={slug}>
            <Link
              href={href}
              className="glass-pill inline-flex h-10 items-center gap-1.5 px-5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg focus-visible:ring-offset-2"
            >
              {label}
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
