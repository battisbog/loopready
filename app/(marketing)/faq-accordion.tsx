"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Real accordion: one item open at a time, driven by the actual question
 * being clicked -- not a static list of always-expanded dt/dd pairs. A
 * six-question page that shows every answer at once forces a visitor to
 * scan past five answers they didn't ask for to find the one they came for;
 * collapsed-by-default with animated height fixes that without hiding
 * anything permanently.
 *
 * role="region" + aria-labelledby on the answer, aria-expanded +
 * aria-controls on the trigger: a screen reader gets the same open/closed
 * state a sighted user sees, not just a visual chevron.
 */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const reduced = useReducedMotion();
  const baseId = useId();

  return (
    <dl className="mt-10 divide-y divide-line">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        const triggerId = `${baseId}-trigger-${i}`;
        const panelId = `${baseId}-panel-${i}`;

        return (
          <div key={item.q}>
            <dt>
              <button
                type="button"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-6 text-left"
              >
                <span className="text-base font-medium text-primary">
                  {item.q}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
                    isOpen && "rotate-45"
                  )}
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </dt>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.dd
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  initial={reduced ? undefined : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduced ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="pb-6 text-sm leading-relaxed text-secondary">
                    {item.a}
                  </p>
                </motion.dd>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </dl>
  );
}
