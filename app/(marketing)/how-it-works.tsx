"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Flat numbered steps, Linear-style: plain numerals (no circle/badge
 * container) sitting on a thin rule that draws left to right as the section
 * scrolls into view. This replaced an earlier version with round bordered
 * "01/02/03" node markers threaded by a connecting line -- accurate to the
 * "pick one, then the next" sequence, but the circular badges read as UI
 * chrome (steppers, wizards) rather than typography. A bare numeral above a
 * hairline says the same thing -- this is an order -- with less on the page.
 */
const STEPS = [
  {
    n: "01",
    title: "Pick your target",
    body: "Choose the company and the level you're actually interviewing for: Amazon SDE II, Google L5, Meta E4. The interview is built from that.",
  },
  {
    n: "02",
    title: "Talk it through",
    body: "Tap the mic and answer out loud, the way you will on the day. The interviewer listens, follows up, and pushes back when you're vague.",
  },
  {
    n: "03",
    title: "Read the hard truth",
    body: "Get a structured debrief in under a minute: hire / borderline / no-hire, per-answer breakdown, your top issues, and stronger rewrites.",
  },
] as const;

export default function HowItWorks() {
  const reduced = useReducedMotion();

  return (
    <div className="mt-16">
      <div className="relative grid gap-10 md:grid-cols-3 md:gap-10">
        {/* The connecting rule. One continuous hairline across the full row
            rather than three column-local ones, so a single scaleX draws it
            left to right in one motion -- the line IS the sequence, not
            three coincidentally-aligned segments. success/40 rather than a
            neutral line-strong: this is the one restrained green touch in
            the section, on the element that literally represents "the
            order things happen in". Hidden below md: three stacked items
            have nothing to connect, so each gets its own rule instead (see
            border-t on the column below). */}
        <motion.div
          aria-hidden
          className="absolute left-0 right-0 top-0 hidden h-px bg-success/40 md:block"
          style={{ originX: 0 }}
          initial={reduced ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        />

        {STEPS.map((step, i) => (
          <motion.div
            key={step.n}
            // Mobile: each column carries its own top hairline, since the
            // shared rule above is md:block only. Desktop: no border here --
            // the shared rule already draws across the row above the grid,
            // and a second one per-column would double it up.
            className="relative border-t border-line pt-7 md:border-t-0 md:pt-9"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{
              duration: 0.5,
              // Each column "lights up" roughly when the drawing rule would
              // reach it, so the rule reads as the cause of the reveal.
              delay: 0.15 + i * 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {/* Flat numeral, no circle/badge container -- the number is
                typography sitting on the rule, not an icon floating above
                it. tabular-nums keeps 01/02/03 the same width so the three
                titles below still line up. */}
            <span className="font-mono text-3xl font-semibold tabular-nums text-line-strong sm:text-4xl">
              {step.n}
            </span>
            <h3 className="mt-5 text-lg font-semibold text-primary">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              {step.body}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
