"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Scroll-triggered entrance used across the marketing page.
 *
 * `once` matters: without it a section re-animates every time it scrolls back
 * into view, which reads as a glitch rather than an effect. `amount: 0.25`
 * fires when a quarter of the element is visible, so tall sections do not wait
 * until they are fully on screen -- by then the reveal has already been missed.
 *
 * Reduced motion is honoured by rendering the final state immediately rather
 * than by shortening the animation, because the point of the setting is that
 * nothing moves at all.
 */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  /** Seconds. Stagger siblings with 0.06-0.1 steps. */
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
