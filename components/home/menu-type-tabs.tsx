import Link from "next/link";

/**
 * The menu-type strip, recreated from Brooki's category tabs: a horizontal row
 * of large words, the current one in full brand dark and the rest dropped back
 * to a light grey, with no underline, pill or box around any of them. The type
 * carries the state entirely.
 *
 * These NAVIGATE rather than switching content in place — selecting a menu
 * opens its own page, which is how it was specified. That is why they are
 * anchors and not buttons: it keeps them middle-clickable, and a screen reader
 * announces them as links to somewhere rather than as a tablist.
 *
 * One source of truth for which menus exist; both the strip and
 * app/menu/[type]/page.tsx read from it.
 */
export const MENU_TYPE_ORDER = [
  { slug: "daily", label: "Daily Menu" },
  { slug: "preorder", label: "Preorder Menu" },
  { slug: "specials", label: "Specials" },
] as const;

export function MenuTypeTabs({ active }: { active?: string }) {
  return (
    <nav aria-label="Menu types">
      {/* Scrolls rather than wraps: three long labels do not fit a 375px row,
          and wrapping them turns a tab strip into a paragraph. */}
      <ul className="no-scrollbar -mx-4 flex items-baseline gap-6 overflow-x-auto px-4 md:mx-0 md:gap-9 md:px-0">
        {MENU_TYPE_ORDER.map(({ slug, label }) => {
          const isActive = slug === active;
          return (
            <li key={slug} className="shrink-0">
              <Link
                href={`/menu/${slug}`}
                aria-current={isActive ? "page" : undefined}
                className={`block whitespace-nowrap text-[clamp(1.35rem,3.2vw,2rem)] font-medium tracking-[-0.03em] transition-colors ${
                  isActive
                    ? "text-bk-maroon"
                    : "text-bk-fg/30 hover:text-bk-fg/60"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
