"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Cake } from "lucide-react";

/**
 * Kinetic image: shimmer skeleton while loading, then the image itself
 * clip-wipes + scales + desaturate→color reveals once loaded.
 * Falls back to a pastel placeholder when src is missing.
 * Respects prefers-reduced-motion.
 */
export function KineticImage({
  src,
  alt,
  className = "",
  aspect = "aspect-[4/3]",
  shimmer = "bg-pink-soft",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  aspect?: string;
  shimmer?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [loaded, setLoaded] = useState(false);

  if (!src) {
    return (
      <div className={`${aspect} overflow-hidden rounded-xl ${shimmer}`}>
        <div className="flex h-full w-full items-center justify-center text-ink-faint">
          <Cake size={28} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${aspect} relative overflow-hidden rounded-xl bg-pink-soft ${className}`}>
      {/* Shimmer skeleton */}
      {!loaded && <div className="skeleton absolute inset-0 z-10" />}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className="h-full w-full object-cover"
        style={{ opacity: loaded ? 1 : 0 }}
        loading="lazy"
      />

      {loaded && !reduceMotion && (
        <motion.div
          className="absolute inset-0"
          initial={{ clipPath: "inset(0 100% 0 0)", filter: "grayscale(1)" }}
          animate={{ clipPath: "inset(0 0% 0 0)", filter: "grayscale(0)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="h-full w-full object-cover scale-105" loading="lazy" />
        </motion.div>
      )}
    </div>
  );
}