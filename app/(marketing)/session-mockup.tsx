"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { BrowserChrome } from "./dashboard-mockup";
import { cn } from "@/lib/cn";

/**
 * A coded snapshot of a real coding round, replacing the static screenshot the
 * hero used to ship.
 *
 * Two things this buys beyond crispness. It stays honest: the problem
 * statement, function signature and test cases below are the actual
 * `two-sum` entry from lib/coding/problems/arrays-hashing.ts, so it cannot
 * drift into showing a problem the product does not have. And it stays
 * truthful about what it IS -- the status line says "snapshot", because a
 * still frame that implies a live session is a promise the markup cannot keep.
 *
 * The interviewer panel is a slot, not a hardcoded placeholder: pass `video`
 * to swap the poster frame for a real clip without touching anything else.
 */
export default function SessionMockup({
  video,
  className,
  revealOnScroll = false,
}: {
  /** A <video> element. Replaces the poster frame when supplied. */
  video?: ReactNode;
  className?: string;
  /**
   * Animate the panel in as it enters the viewport, with the code lines and
   * test results arriving in sequence after it. Off by default so the panel
   * can still be dropped somewhere already-visible without a delay before it
   * paints.
   */
  revealOnScroll?: boolean;
}) {
  const reduced = useReducedMotion();
  // Reduced motion collapses the whole sequence, not just the outer slide:
  // staggered lines are the same "things moving on screen" the setting exists
  // to switch off.
  const reveal = revealOnScroll && !reduced;

  return (
    <motion.div
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-base shadow-2xl shadow-[var(--shadow-lg)]",
        className
      )}
      initial={reveal ? { opacity: 0, y: 32 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <BrowserChrome url="loopready.io/session" />

      {/* Session context, exactly as the round header renders it in-product. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line bg-surface px-4 py-2.5 text-xs">
        <span className="font-medium text-primary">Coding Interview</span>
        <Dot />
        <span className="text-secondary">Amazon</span>
        <Dot />
        <span className="text-secondary">SDE II</span>
        <Dot />
        <span className="text-secondary">Two Sum</span>
        <span className="ml-auto font-mono text-muted">08:41</span>
      </div>

      <div className="grid gap-px bg-line md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        {/* ---- Interviewer ---- */}
        <div className="bg-base p-4">
          <div className="relative aspect-video overflow-hidden rounded-md border border-line bg-inset">
            {video ?? <InterviewerPoster speaking={!reduced} />}
          </div>

          <div className="mt-3 space-y-2.5">
            <Line role="interviewer">
              Before you write anything — what&rsquo;s the brute force here, and
              what does it cost you?
            </Line>
            <Line role="candidate">
              Nested loops, so O(n²) time, O(1) space. I want to trade space for
              time with a hash map of value to index.
            </Line>
            <Line role="interviewer">
              Good. What happens when the same value shows up twice?
            </Line>
          </div>
        </div>

        {/* ---- Editor ---- */}
        <div className="flex flex-col bg-base">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-[11px]">
            <span className="rounded-sm bg-elevated px-2 py-0.5 font-mono text-secondary">
              solution.py
            </span>
            <span className="text-muted">Python</span>
            <span className="ml-auto rounded-sm border border-line px-2 py-0.5 text-muted">
              Run tests
            </span>
          </div>

          <pre className="flex-1 overflow-x-auto bg-inset px-4 py-3 font-mono text-[11px] leading-relaxed sm:text-xs">
            <code>
              <CodeLine n={1} reveal={reveal}>
                <Kw>def</Kw> <Fn>two_sum</Fn>
                <Pn>(nums, target):</Pn>
              </CodeLine>
              <CodeLine n={2} reveal={reveal}>
                {"    "}seen <Pn>=</Pn> <Fn>{"{}"}</Fn>
              </CodeLine>
              <CodeLine n={3} reveal={reveal}>
                {"    "}
                <Kw>for</Kw> i, n <Kw>in</Kw> <Fn>enumerate</Fn>
                <Pn>(nums):</Pn>
              </CodeLine>
              <CodeLine n={4} reveal={reveal}>
                {"        "}need <Pn>=</Pn> target <Pn>-</Pn> n
              </CodeLine>
              <CodeLine n={5} reveal={reveal}>
                {"        "}
                <Kw>if</Kw> need <Kw>in</Kw> seen<Pn>:</Pn>
              </CodeLine>
              <CodeLine n={6} reveal={reveal}>
                {"            "}
                <Kw>return</Kw> <Pn>[</Pn>seen<Pn>[</Pn>need<Pn>], i]</Pn>
              </CodeLine>
              <CodeLine n={7} reveal={reveal}>
                {"        "}seen<Pn>[</Pn>n<Pn>] =</Pn> i
              </CodeLine>
              <CodeLine n={8} caret reveal={reveal}>
                {"    "}
                <Kw>return</Kw> <Pn>[]</Pn>
              </CodeLine>
            </code>
          </pre>

          {/* Bottom panel. In-product the statement and the run output share
              one tabbed pane (see code-surface.tsx), so the tab strip is here
              too rather than inventing a layout the product does not have. */}
          <div className="flex items-center gap-4 border-t border-line px-4 pt-2.5 text-[11px]">
            <span className="text-muted">Problem</span>
            <span className="border-b-2 border-accent pb-1 font-medium text-primary">
              Console
            </span>
          </div>

          {/* Real test cases from the two-sum entry in the bank. */}
          <div className="bg-base px-4 py-3 font-mono text-[11px] leading-relaxed">
            <Test pass reveal={reveal} index={0} args="[2, 7, 11, 15], 9" got="[0, 1]" />
            <Test pass reveal={reveal} index={1} args="[3, 2, 4], 6" got="[1, 2]" />
            <Test pass reveal={reveal} index={2} args="[3, 3], 6" got="[0, 1]" />
            <p className="mt-1.5 text-secondary">
              <span className="text-success">3 passed</span>
              <span className="text-muted"> · 5 total · 2 hidden</span>
            </p>
          </div>
        </div>
      </div>

      {/* Never claims to be live. It is a still frame, and says so. */}
      <div className="flex items-center gap-2 border-t border-line bg-surface px-4 py-2.5 text-[11px] text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Snapshot from a real coding round · behavioral and system design run in
        the same workspace
      </div>
    </motion.div>
  );
}

function Dot() {
  return <span className="text-muted">·</span>;
}

/**
 * Stand-in for the interviewer video: an abstract portrait frame with a
 * speaking indicator, not a fake human face. A placeholder that pretended to
 * be a person would be the one part of this panel that is a lie.
 */
function InterviewerPoster({ speaking }: { speaking: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_50%_35%,rgb(16_185_129/0.16),transparent_65%)]">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-accent-border bg-accent-muted">
        {speaking && (
          <span className="ring-pulse absolute inset-0 rounded-full border border-accent-border" />
        )}
        <span className="text-lg font-semibold text-accent">LR</span>
      </div>
      <div className="flex items-end gap-1" aria-hidden>
        {[0, 0.12, 0.24, 0.36, 0.48].map((delay, i) => (
          <span
            key={i}
            className={cn("w-0.5 rounded-full bg-accent/70", speaking && "wave-bar")}
            style={{
              height: `${8 + (i % 3) * 5}px`,
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted">Interviewer speaking</p>
    </div>
  );
}

/**
 * One transcript line. The candidate gets the cool accent and the interviewer
 * the emerald one, matching the in-product convention so the two voices are
 * never confusable at a glance.
 */
function Line({
  role,
  children,
}: {
  role: "interviewer" | "candidate";
  children: ReactNode;
}) {
  const interviewer = role === "interviewer";
  return (
    <div className="flex gap-2">
      <span
        className={cn(
          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
          interviewer ? "bg-accent" : "bg-accent-cool"
        )}
      />
      <p
        className={cn(
          "text-xs leading-relaxed",
          interviewer ? "text-secondary" : "text-primary"
        )}
      >
        {children}
      </p>
    </div>
  );
}

/**
 * One line of the editor.
 *
 * When revealing, lines arrive top to bottom keyed off their own line number,
 * which reads as the solution being written rather than as a block of text
 * fading in. Offsetting x rather than y keeps each line on its own baseline --
 * lines sliding vertically past each other in a monospace block looks like a
 * rendering fault.
 */
function CodeLine({
  n,
  caret,
  reveal,
  children,
}: {
  n: number;
  caret?: boolean;
  reveal?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.span
      className="flex whitespace-pre"
      initial={reveal ? { opacity: 0, x: -6 } : false}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.3, delay: 0.35 + n * 0.07 }}
    >
      <span className="w-6 shrink-0 select-none text-right text-muted">{n}</span>
      <span className="pl-3 text-primary">
        {children}
        {caret && (
          <motion.span
            className="ml-px inline-block h-3 w-px translate-y-[2px] bg-accent"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
          />
        )}
      </span>
    </motion.span>
  );
}

const Kw = ({ children }: { children: ReactNode }) => (
  <span className="text-accent-cool">{children}</span>
);
const Fn = ({ children }: { children: ReactNode }) => (
  <span className="text-accent">{children}</span>
);
const Pn = ({ children }: { children: ReactNode }) => (
  <span className="text-secondary">{children}</span>
);

/**
 * One console row. `index` sequences these AFTER the last code line, so the
 * panel plays in the order it would really happen: the solution appears, then
 * the tests report on it.
 */
function Test({
  pass,
  args,
  got,
  reveal,
  index = 0,
}: {
  pass?: boolean;
  args: string;
  got: string;
  reveal?: boolean;
  index?: number;
}) {
  return (
    <motion.p
      className="flex gap-2 whitespace-pre-wrap"
      initial={reveal ? { opacity: 0, x: -6 } : false}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.3, delay: 1.05 + index * 0.14 }}
    >
      <span className={pass ? "text-success" : "text-error"}>
        {pass ? "✓" : "✕"}
      </span>
      <span className="text-muted">two_sum({args})</span>
      <span className="text-secondary">→ {got}</span>
    </motion.p>
  );
}
