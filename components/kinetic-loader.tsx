"use client";

import { motion } from "framer-motion";
import { Cake } from "lucide-react";

/**
 * Kinetic loading placeholder shown while server data streams in.
 * Animated cake icon + skeleton shimmer bars matching homepage card layout.
 */
export function KineticLoader() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        <motion.div
          className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-pink-soft text-pink"
          animate={{ y: [0, -12, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Cake size={36} />
          <motion.span
            className="absolute -bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-pink"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        <p className="text-sm font-medium text-ink-soft">Baking today&rsquo;s menu...</p>
      </div>

      {/* Skeleton grid matching homepage card layout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="skeleton aspect-[4/3] rounded-xl" />
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}