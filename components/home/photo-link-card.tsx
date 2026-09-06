import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SmartImage } from "@/components/kinetic/smart-image";

/**
 * A big photograph you tap, with the title over it.
 *
 * One component rather than a shape copied twice: the two menu cards and the
 * custom-order card have to look like the same object, and the last time this
 * markup was duplicated across the site — the product card, before the
 * redesign — the three copies drifted apart. If the scrim or the radius
 * changes, it changes everywhere.
 */
export interface PhotoLinkCardProps {
  href: string;
  title: string;
  blurb: string;
  imageUrl?: string | null;
  /** A short line under the blurb, e.g. "45 items" or "Up to 5 days' notice". */
  meta?: string;
  /** Set on the first card above the fold only. */
  priority?: boolean;
  sizes?: string;
  /** Taller on its own than side by side, so a full-width card is not a strip. */
  aspect?: string;
}

export function PhotoLinkCard({
  href,
  title,
  blurb,
  imageUrl,
  meta,
  priority = false,
  sizes = "(max-width: 768px) 92vw, 700px",
  aspect = "aspect-[4/3] md:aspect-[16/10]",
}: PhotoLinkCardProps) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[var(--bk-r-block)] bg-bk-bg-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-bk-fg focus-visible:ring-offset-2"
    >
      <SmartImage
        src={imageUrl}
        alt=""
        aspect={aspect}
        sizes={sizes}
        priority={priority}
        fit="cover"
        className="rounded-none transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />

      {/* The scrim is what makes the title legible. Without it the copy sits on
          whatever the photograph happens to be — these are phone photos of iced
          cakes, so the bottom of the frame is as often white as it is dark, and
          a fixed text colour fails on half of them. Sized to cover the copy
          block, not the whole image. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/60 to-transparent"
      />

      <div
        data-contrast-ground="cocoa"
        className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-7"
      >
        <div>
          <h3 className="text-xl font-semibold text-white md:text-2xl">{title}</h3>
          <p className="mt-1 max-w-[34ch] text-sm leading-snug text-white/95">{blurb}</p>
          {meta && (
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-white/80">
              {meta}
            </p>
          )}
        </div>
        <span className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-white/95 text-bk-fg transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
          <ArrowRight size={19} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
