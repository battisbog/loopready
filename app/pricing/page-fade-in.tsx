"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Wraps the standalone /pricing route's content so arriving here from a
 * client-side navigation (e.g. the hero's "Start for free") fades in instead
 * of hard-cutting from the previous page. Scoped to this one route rather
 * than a global template: the reported issue was specifically the jump into
 * /pricing, and a route-specific wrapper is the smaller, more contained fix
 * versus changing how every navigation in the app transitions.
 */
export default function PageFadeIn({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
