import { clsx } from "clsx";
import type { ReactNode } from "react";

type Color = "pink" | "mint" | "lavender" | "peach" | "sky" | "yellow" | "neutral";

interface BadgeProps {
  color?: Color;
  children: ReactNode;
  className?: string;
}

/**
 * Every non-neutral badge was previously near-white text on a near-white
 * background (mint was #F2E6D8 text on #F9F2E9 background, ~1.1:1) and
 * was effectively invisible. The palette's "colours" are all pale surfaces, so
 * they can tint a background but can never BE the text colour. Foregrounds now
 * come from the ink/berry/cocoa ramp, which actually has contrast.
 */
const colors: Record<Color, string> = {
  pink: "bg-blush text-cocoa border-berry/25",
  mint: "bg-mint-soft text-cocoa border-ink/12",
  lavender: "bg-lavender-soft text-cocoa border-ink/12",
  peach: "bg-peach-soft text-cocoa border-ink/12",
  sky: "bg-sky-soft text-cocoa border-ink/12",
  yellow: "bg-yellow-soft text-gold-deep border-gold/30",
  neutral: "bg-ink/6 text-ink-soft border-ink/12",
};

export function Badge({ color = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        colors[color],
        className
      )}
    >
      {children}
    </span>
  );
}
