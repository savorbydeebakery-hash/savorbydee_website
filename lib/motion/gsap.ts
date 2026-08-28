"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single place where ScrollTrigger is registered.
 *
 * Registering inside each component is safe but wasteful, and easy to forget —
 * a missing registration fails at runtime with a cryptic "target not found".
 * Importing `gsap` from here guarantees the plugin is attached.
 *
 * React 19 Strict Mode double-invokes effects, so every consumer must use
 * `useGSAP` from @gsap/react (which wraps gsap.context and reverts on cleanup)
 * rather than a bare useEffect, or triggers accumulate on every remount.
 */
// registerPlugin is idempotent, so this is safe to run on every import.
// Guarded on `window` because ScrollTrigger touches document at registration.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Matches the --ease-out token in globals.css. */
export const EASE = "power3.out";

/**
 * True when the visitor has asked for reduced motion.
 * Prefer `gsap.matchMedia()` for anything scroll-bound; use this for one-off
 * imperative branches.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger };
