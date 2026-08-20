import { clsx } from "clsx";
import type { ReactNode } from "react";

type Color = "pink" | "mint" | "lavender" | "peach" | "sky" | "yellow" | "neutral";

interface BadgeProps {
  color?: Color;
  children: ReactNode;
  className?: string;
}

const colors: Record<Color, string> = {
  pink: "bg-pink-soft text-pink border-pink/20",
  mint: "bg-mint-soft text-mint border-mint/20",
  lavender: "bg-lavender-soft text-lavender border-lavender/20",
  peach: "bg-peach-soft text-peach border-peach/20",
  sky: "bg-sky-soft text-sky border-sky/20",
  yellow: "bg-yellow-soft text-yellow border-yellow/20",
  neutral: "bg-ink/5 text-ink-soft border-ink/10",
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
