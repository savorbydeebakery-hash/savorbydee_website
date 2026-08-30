import type { LucideIcon } from "lucide-react";

export interface FeatureTile {
  icon: LucideIcon;
  label: string;
  /** Second line. Short ones sit under the label; long ones force the
   *  one-per-row phone layout — see the grid note below. */
  sub: string;
}

/**
 * Three feature tiles in a row, following Little Token's trust strip: a tinted
 * rounded tile, a centred icon in the brand dark, a bold label and a quieter
 * second line.
 *
 * GRID: Little Token keeps three across even on a phone, which works because
 * its labels are two words ("Same Day" / "Delivery"). The preorder set carries
 * full sentences, and three of those across 375px gives ~100px columns and
 * eight-line wraps. So the column count is chosen from the content rather than
 * fixed: short subs keep the reference's 3-up, long ones stack until `sm`.
 */
export function MenuFeatureTiles({ tiles }: { tiles: FeatureTile[] }) {
  // 34 characters is roughly where a sub stops fitting a ~110px phone column.
  const hasLongCopy = tiles.some((t) => t.sub.length > 34);

  return (
    <ul
      className={`grid gap-2 md:gap-3 ${
        hasLongCopy ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-3"
      }`}
    >
      {tiles.map(({ icon: Icon, label, sub }) => (
        <li
          key={label}
          className={`rounded-[var(--bk-r-inner)] bg-bk-pink-soft px-3 py-4 md:px-4 md:py-5 ${
            hasLongCopy ? "text-left sm:text-center" : "text-center"
          }`}
        >
          <span
            className={`flex ${hasLongCopy ? "justify-start sm:justify-center" : "justify-center"}`}
          >
            <Icon
              size={22}
              strokeWidth={1.8}
              className="text-bk-maroon"
              aria-hidden="true"
            />
          </span>
          <p className="mt-2 text-sm font-semibold leading-snug text-bk-fg md:text-base">
            {label}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-bk-muted md:text-sm">
            {sub}
          </p>
        </li>
      ))}
    </ul>
  );
}
