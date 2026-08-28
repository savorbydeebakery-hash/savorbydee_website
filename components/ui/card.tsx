import { clsx } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function Card({ className, children, hover, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-ink/8 bg-white p-5",
        hover && "transition-all hover:shadow-lg hover:shadow-gold/15 hover:border-gold/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
