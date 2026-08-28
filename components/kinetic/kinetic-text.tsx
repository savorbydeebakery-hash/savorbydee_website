"use client";

import { Fragment, type ElementType } from "react";

/**
 * Masked text reveal (CSS-driven, hydration-safe).
 *
 * Words are fully visible in the server HTML (no hidden state — zero
 * hydration risk). On mount, the browser runs a CSS keyframe animation that
 * rises each word through an overflow mask. The global `prefers-reduced-motion`
 * block disables the animation, so reduced-motion users see the text instantly.
 */
export function KineticText({
  text,
  className = "",
  tag = "span",
}: {
  text: string;
  className?: string;
  tag?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const words = text.split(" ");
  const El = tag as ElementType;

  return (
    <El className={className}>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="kinetic-word-mask">
            <span className="kinetic-word" style={{ animationDelay: `${i * 0.05}s` }}>
              {word}
            </span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </El>
  );
}