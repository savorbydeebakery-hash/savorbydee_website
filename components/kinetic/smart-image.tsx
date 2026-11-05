"use client";

import Image from "next/image";
import { Cake } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Aspect-boxed image, on a soft tint until the photo arrives.
 *
 * No load-in reveal, on purpose. Each photo used to start grey, zoomed and
 * see-through and fade in over 0.7s, even when it was already saved on the phone,
 * so pictures looked like they were reloading on every visit. It also left a
 * filter and a transform on every photo for good, which on an iPhone makes pictures
 * blink as they scroll back into view (client, 2026-11-05).
 *
 * decoding="sync" for the same reason: next/image's default of "async" lets a phone
 * show a blank box for a moment when it has dropped a decoded photo from memory.
 */
export function SmartImage({
  src,
  alt,
  className = "",
  aspect = "aspect-[4/3]",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px",
  priority = false,
  fit = "cover",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  aspect?: string;
  /** Match the rendered box — a wrong value silently ships an oversized file. */
  sizes?: string;
  /** Set on the LCP image only. Disables lazy loading. */
  priority?: boolean;
  /**
   * "contain" shows the whole frame. Use it for product photography, where the
   * subject is often off-centre and cropping cuts the cake out of the picture.
   * It also switches the Supabase transform to resize=contain, without which
   * the crop has already happened server side.
   */
  fit?: "cover" | "contain";
}) {
  if (!src) {
    return (
      <div
        className={cn(
          aspect,
          "flex items-center justify-center overflow-hidden rounded-2xl bg-pink-soft text-ink-faint",
          className
        )}
      >
        <Cake size={28} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        aspect,
        "relative overflow-hidden rounded-2xl bg-pink-soft",
        className
      )}
    >
      <Image
        src={fit === "contain" ? `${src}#contain` : src}
        alt={alt}
        fill
        sizes={sizes}
        preload={priority}
        decoding="sync"
        className={fit === "contain" ? "object-contain" : "object-cover"}
      />
    </div>
  );
}
