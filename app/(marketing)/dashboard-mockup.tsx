"use client";

import { motion, useReducedMotion } from "motion/react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Badge, Card, CardLabel } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * A coded recreation of the real LoopReady dashboard.
 *
 * This replaces a screenshot. That matters for more than crispness: it is
 * built from the SAME primitives the real dashboard uses -- Card, CardLabel,
 * Badge, and the token scale in globals.css -- so when the product's surface
 * colours or radii change, the marketing page follows automatically instead of
 * drifting until someone notices the screenshot is a year old.
 *
 * Every number rendered here arrives as a prop. Nothing is hardcoded inside
 * the markup, so the same component can show a persuasive marketing sample
 * today and be pointed at a real account's aggregates later without a rewrite.
 */

export interface RoundDatum {
  /** Round name exactly as the product writes it. */
  label: string;
  value: number;
}

export interface DashboardMockupProps {
  firstName?: string;
  interviews: number;
  completed: number;
  rounds: RoundDatum[];
  signal: "hire" | "borderline" | "no-hire";
  plan: string;
  history: {
    company: string;
    level: string;
    round: string;
    signal: "hire" | "borderline" | "no-hire";
    when: string;
  }[];
  className?: string;
}

const SIGNAL_TONE = {
  hire: "success",
  borderline: "warn",
  "no-hire": "error",
} as const;

export default function DashboardMockup({
  firstName = "Aryan",
  interviews,
  completed,
  rounds,
  signal,
  plan,
  history,
  className,
}: DashboardMockupProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-base shadow-2xl shadow-[var(--shadow-lg)]",
        className
      )}
    >
      <BrowserChrome url="loopready.io/dashboard" />

      <div className="space-y-5 p-5 sm:p-6">
        <header>
          <p className="text-lg font-semibold tracking-tight text-primary">
            Welcome back, {firstName}
          </p>
          <p className="mt-1 text-sm text-secondary">
            Run a mock, then read the debrief like a real interviewer would
            write it.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardLabel>Interviews</CardLabel>
            <div className="mt-2">
              <p className="text-3xl font-semibold tracking-tight text-primary">
                <NumberTicker value={interviews} />
              </p>
              <p className="mt-1 text-xs text-muted">{completed} completed</p>
            </div>
          </Card>

          {/* The data-driven piece. See RoundBreakdown. */}
          <Card className="sm:col-span-2">
            <CardLabel>By round</CardLabel>
            <RoundBreakdown rounds={rounds} />
          </Card>

          <Card>
            <CardLabel>Latest signal</CardLabel>
            <div className="mt-3">
              <Badge tone={SIGNAL_TONE[signal]} dot>
                {signal}
              </Badge>
            </div>
            <div className="mt-4">
              <CardLabel>Plan</CardLabel>
              <div className="mt-2">
                <Badge tone="accent">{plan}</Badge>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Recent sessions
          </p>
          <div className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {history.map((row, i) => (
              <motion.div
                key={`${row.company}-${row.round}-${i}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
              >
                <span className="text-sm font-medium text-primary">
                  {row.company}
                </span>
                <span className="text-xs text-muted">{row.level}</span>
                <span className="text-xs text-secondary">{row.round}</span>
                <span className="ml-auto flex items-center gap-3">
                  <span className="text-xs text-muted">{row.when}</span>
                  <Badge tone={SIGNAL_TONE[row.signal]}>{row.signal}</Badge>
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The "By round" breakdown, drawn from data rather than baked into an image.
 *
 * Bars are scaled against the largest value in the set, not against a fixed
 * ceiling, so the shape stays readable whether the numbers are 3/2/1 or
 * 300/200/100. Guarding `max` at 1 keeps an all-zero set from dividing by zero
 * and rendering NaN-width bars.
 *
 * The bar draws with scaleX from a left origin rather than by animating width,
 * because transforms are composited and width is not -- three bars animating
 * width would lay out the whole card on every frame.
 */
function RoundBreakdown({ rounds }: { rounds: RoundDatum[] }) {
  const reduced = useReducedMotion();
  const max = Math.max(1, ...rounds.map((r) => r.value));

  return (
    <div className="mt-3 space-y-2.5">
      {rounds.map((round, i) => (
        <div key={round.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm text-secondary">
            {round.label}
          </span>
          <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-elevated">
            <motion.span
              className="absolute inset-y-0 left-0 block rounded-full bg-accent"
              style={{ width: `${(round.value / max) * 100}%`, originX: 0 }}
              initial={reduced ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{
                duration: 0.8,
                delay: 0.15 + i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </span>
          <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-primary">
            <NumberTicker value={round.value} delay={0.15 + i * 0.1} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Shared window frame so the dashboard and session panels read as one set. */
export function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-line bg-surface px-4 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-elevated" />
      <span className="h-2.5 w-2.5 rounded-full bg-elevated" />
      <span className="h-2.5 w-2.5 rounded-full bg-elevated" />
      <span className="ml-3 truncate font-mono text-[11px] text-muted">
        {url}
      </span>
    </div>
  );
}
