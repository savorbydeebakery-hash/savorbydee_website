"use client";

import Image from "next/image";
import { useState } from "react";
import { Cake } from "lucide-react";

/**
 * Aspect-boxed image with a shimmer skeleton and a load-in reveal
 * (scale + desaturate → colour).
 *
 * Replaces the old KineticImage, which stacked TWO <img> elements with the
 * same src — one plain, one inside a framer-motion clip-wipe overlay — so
 * every image on the site cost 2 DOM nodes and 2 decodes. Here the same reveal
 * is a CSS transition on a single next/image, which also brings responsive
 * srcset and WebP via the Supabase loader.
 *
 * Prop signature is unchanged from KineticImage (plus `sizes` and `priority`)
 * so call sites only needed an import swap.
 */
export function SmartImage({
  src,
  alt,
  className = "",
  aspect = "aspect-[4/3]",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  aspect?: string;
  /** Match the rendered box — a wrong value silently ships an oversized file. */
  sizes?: string;
  /** Set on the LCP image only. Disables lazy loading. */
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  if (!src) {
    return (
      <div
        className={`${aspect} flex items-center justify-center overflow-hidden rounded-2xl bg-pink-soft text-ink-faint ${className}`}
      >
        <Cake size={28} />
      </div>
    );
  }

  return (
    <div
      className={`${aspect} relative overflow-hidden rounded-2xl bg-pink-soft ${className}`}
    >
      {!loaded && <div className="skeleton absolute inset-0 z-10" />}

      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        className="object-cover transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "scale(1)" : "scale(1.04)",
          filter: loaded ? "grayscale(0)" : "grayscale(1)",
        }}
      />
    </div>
  );
}
