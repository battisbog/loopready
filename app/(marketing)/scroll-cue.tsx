"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * "There is more below" cue for the standalone hero.
 *
 * A hero that fills the viewport on its own reads as the whole page to a
 * visitor who does not think to scroll, so this is doing real work, not
 * decoration. It is an anchor rather than a bare graphic for the same reason:
 * anyone who reads it as "there is more" can click it and get there, and it
 * lands in the tab order with a label instead of being invisible to a screen
 * reader.
 *
 * The bounce is deliberately small (6px) and slow. A cue that moves more than
 * that competes with the headline it is supposed to be subordinate to.
 */
export default function ScrollCue({ href = "#product" }: { href?: string }) {
  const reduced = useReducedMotion();

  return (
    <a
      href={href}
      className="group inline-flex flex-col items-center gap-2 rounded-md px-3 py-2 text-xs text-muted transition-colors hover:text-secondary"
    >
      <span className="uppercase tracking-[0.2em]">Scroll</span>
      <motion.svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        aria-hidden
        animate={reduced ? undefined : { y: [0, 6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M12 5v14M6 13l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </a>
  );
}
