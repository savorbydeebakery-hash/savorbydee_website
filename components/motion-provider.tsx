"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Client wrapper that applies framer-motion's global reduced-motion handling
 * ("user" = respect prefers-reduced-motion). Keeps motion config SSR-safe
 * without per-component branching.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}