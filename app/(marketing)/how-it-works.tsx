"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Replaces three identical cards in a row with a connected sequence: a line
 * that draws left to right as the section scrolls into view, with each step
 * lighting up as the line reaches it. Three cards side by side say "pick
 * one"; a drawn line says "this is an order", which is the actual point --
 * pick a target, then talk, then read the verdict.
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
      <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
        {/* The connecting line. Absolutely positioned through the row of
            number markers rather than three separate segments, so one
            scaleX animation draws the whole thing continuously instead of
            three independently-timed pieces that can visibly desync. Hidden
            below md: three items with no shared row have nothing to connect. */}
        <motion.div
          aria-hidden
          className="absolute left-[16.5%] right-[16.5%] top-6 hidden h-px bg-line-strong md:block"
          style={{ originX: 0 }}
          initial={reduced ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        />

        {STEPS.map((step, i) => (
          <motion.div
            key={step.n}
            className="relative"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{
              duration: 0.5,
              // Each marker "lights up" roughly when the drawing line would
              // reach it, so the line reads as the cause of the reveal.
              delay: 0.15 + i * 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-accent-border bg-base font-mono text-sm text-accent">
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
