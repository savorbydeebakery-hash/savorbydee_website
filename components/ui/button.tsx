import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-pink text-ink hover:bg-pink/90 shadow-sm shadow-pink/30 transition-all",
  secondary:
    "bg-mint text-ink hover:bg-mint/90 shadow-sm shadow-mint/30 transition-all",
  ghost: "bg-transparent text-ink-soft hover:bg-pink-soft transition-colors",
  danger:
    "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/30 transition-all",
  outline:
    "border border-ink/15 bg-white text-ink hover:border-pink hover:text-pink transition-colors",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3.5 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-pink/40",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
