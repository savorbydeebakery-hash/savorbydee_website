import { clsx } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "solid" | "glass" | "raised";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  /**
   * "glass" only over imagery or a dark band — see the placement rule in
   * globals.css. Over flat cream it reads as grey mud.
   */
  variant?: CardVariant;
}

const variants: Record<CardVariant, string> = {
  solid: "border border-ink/8 bg-porcelain",
  raised: "border border-ink/8 bg-shell",
  glass: "glass",
};

export function Card({
  className,
  children,
  hover,
  variant = "solid",
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-[var(--r-lg)] p-5",
        variants[variant],
        hover &&
          "transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:border-berry/25 hover:shadow-[var(--shadow-lg)] motion-reduce:hover:translate-y-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
