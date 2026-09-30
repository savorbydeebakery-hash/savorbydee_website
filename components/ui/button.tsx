import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ChangeEvent, ReactNode } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "outline"
  | "cocoa"
  | "glass";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  // Retuned to --berry: the old bg-pink (#F6C7CF) with text-ink was a pale
  // wash that read as disabled rather than as the primary action.
  primary:
    "bg-berry text-white hover:bg-berry/90 shadow-[var(--shadow-sm)] transition-all",
  // The page's strongest CTA — dark on cream is the contrast the design leans on.
  cocoa:
    "bg-cocoa text-shell hover:bg-cocoa-soft shadow-[var(--shadow-md)] transition-all",
  secondary:
    "bg-shell text-ink hover:bg-shell/80 border border-ink/10 transition-all",
  ghost: "bg-transparent text-ink-soft hover:bg-shell transition-colors",
  danger:
    "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/30 transition-all",
  outline:
    "border border-ink/15 bg-porcelain text-ink hover:border-berry hover:text-berry transition-colors",
  // Only over imagery or a dark band — see the placement rule in globals.css.
  glass: "glass glass-sheen text-white hover:brightness-110 transition-all",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3.5 text-base rounded-xl",
};

const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-berry/50 focus-visible:ring-offset-2";

/** The Button look, for elements that must not be a <button>. */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return clsx(BASE, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClassName({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}

/**
 * A file picker that looks like a Button.
 *
 * NOT `<label><Button/><input type="file"/></label>`: a <button> is itself a
 * labelable element, so the label points at the button, not the file input,
 * and clicking it opens nothing. That shipped on Gallery and Behind the
 * Scenes and every upload there silently did nothing (found 2026-09-30). Here
 * the visible part is a span, so the label's control is the input.
 */
export function FileButton({
  variant = "primary",
  size = "md",
  className,
  disabled,
  accept,
  multiple,
  onFiles,
  children,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
  onFiles: (e: ChangeEvent<HTMLInputElement>) => void;
  children: ReactNode;
}) {
  return (
    <label
      className={clsx(
        buttonClassName({ variant, size, className }),
        disabled ? "pointer-events-none opacity-50" : "cursor-pointer",
        // The input is visually hidden but focusable, so keyboard users can
        // reach it; show the ring on the label when it has focus.
        "focus-within:ring-2 focus-within:ring-berry/50 focus-within:ring-offset-2"
      )}
    >
      {children}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={onFiles}
        className="sr-only"
      />
    </label>
  );
}
