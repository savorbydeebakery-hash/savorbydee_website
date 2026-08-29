import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Little Token's section header: a bold title on the left, a quiet "See All"
 * on the right, and nothing else — no eyebrow, no rule, no description.
 *
 * The type is the part that has to change between breakpoints. Little Token
 * runs an 18px/700 title because it never leaves a 448px column; Brooki's h2
 * is 32px/500 at -0.04em tracking. This is both: the phone gets Little Token,
 * the desktop gets Brooki. See .bk-section-title in globals.css.
 */
export function SectionHead({
  title,
  handle,
  href,
  linkLabel = "See All",
}: {
  title: string;
  /** Muted text set beside the title, e.g. an Instagram handle. */
  handle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 md:mb-5">
      <div className="flex items-baseline gap-2">
        <h2 className="bk-section-title text-bk-fg">{title}</h2>
        {handle && (
          <span className="text-xs text-bk-muted md:text-sm">{handle}</span>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-bk-fg underline-offset-4 hover:underline"
        >
          {linkLabel}
          <ChevronRight
            size={16}
            className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          />
        </Link>
      )}
    </div>
  );
}
