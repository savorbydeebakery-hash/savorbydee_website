/**
 * MagicUI "interactive-hover-button"
 *
 * Colours remapped from shadcn tokens (bg-primary, bg-background,
 * text-primary-foreground) to this project's palette, which does not define
 * them: berry for the expanding dot, porcelain for the resting surface., vendored from https://magicui.design/r/interactive-hover-button.json
 *
 * Adapted for this project: imports come from framer-motion rather than
 * motion/react, since that is what is installed, and next-themes is stripped
 * because the site is single-theme. Bringing in a second animation runtime
 * alongside GSAP would put two libraries in a fight over the same frames.
 */
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

export function InteractiveHoverButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "group bg-porcelain border-ink/12 text-ink relative w-auto cursor-pointer overflow-hidden rounded-full border p-2 px-6 text-center font-semibold",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        <div className="bg-berry h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-[100.8]"></div>
        <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
          {children}
        </span>
      </div>
      {/* This label is only visible once the berry dot has expanded to fill the
          button, so berry is its real painted ground. Declared for the contrast
          audit, which otherwise measures white against the resting surface and
          reports 1.02:1. */}
      <div
        data-contrast-ground="berry"
        className="text-white absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100">
        <span>{children}</span>
        <ArrowRight />
      </div>
    </button>
  )
}
