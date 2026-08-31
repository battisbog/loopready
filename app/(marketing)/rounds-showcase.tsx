"use client";

import { motion } from "motion/react";
import type { ComponentType } from "react";
import { BrowserChrome } from "./dashboard-mockup";
import { ExchangeArcs, IsoBlocks, NodeWeb } from "./line-art";

/**
 * The three rounds, as a flat three-column figure set.
 *
 * This replaced a tabbed/expanding-card version. The tabs were doing real
 * damage: two of the three rounds were always collapsed to a title, so the
 * section spent its space animating rather than saying what the product
 * does, and the mobile variant needed a whole second layout to stay legible.
 * Three plain columns say all three things at once, in less space, with no
 * interaction to discover.
 *
 * Deliberately flat -- no card fill, no radius, no shadow, hairline dividers
 * only. The columns are typography and line-art on the page background; the
 * one boxed element in this section is the product mockup below, which is
 * where the visual weight belongs.
 */
interface RoundDef {
  key: "coding" | "system_design" | "behavioral";
  /** Plate number, in the manner of a figure in a manual. */
  fig: string;
  title: string;
  /** The single line under the title. One sentence, hard limit -- the whole
   *  point of this layout is that all three are scannable at a glance. */
  blurb: string;
  Icon: ComponentType<{ className?: string }>;
  /**
   * Long-form copy from the previous card design. Nothing renders these now;
   * they are kept because the detail is accurate and hard-won, and re-siting
   * it (a comparison table, the /pricing feature list, a docs page) should be
   * a copy-paste rather than a rewrite. Delete if it is still unused once
   * that decision is made.
   */
  body: string;
  points: string[];
}

const ROUNDS: RoundDef[] = [
  {
    key: "coding",
    fig: "FIG 0.1",
    title: "Coding",
    blurb: "A live editor the interviewer reads as you type, running against real tests.",
    Icon: IsoBlocks,
    body: "A live editor the interviewer reads as you type, running your code against real test cases, with the same questions about approach and complexity you get on the day.",
    points: [
      "Python and JavaScript",
      "Real execution against tests",
      "Probes approach before code",
    ],
  },
  {
    key: "system_design",
    fig: "FIG 0.2",
    title: "System design",
    blurb: "An architecture canvas the interviewer can see, name components on, and push back against.",
    Icon: NodeWeb,
    body: "An architecture canvas the interviewer can see and push back on, referencing your components by name and challenging hand-waving about scale.",
    points: [
      "Drag-and-drop components",
      "Interviewer reads your diagram",
      "Pushes on bottlenecks and trade-offs",
    ],
  },
  {
    key: "behavioral",
    fig: "FIG 0.3",
    title: "Behavioral",
    blurb: "Questions across competencies, answered by voice, with real follow-up probing.",
    Icon: ExchangeArcs,
    body: "Three questions across different competencies, each with real follow-up probing. Answered by voice, graded against your target company's values.",
    points: [
      "Voice in, voice out",
      "Up to two probes per question",
      "18-question bank across 6 competencies",
    ],
  },
];

/** One column. Identical markup in both layouts -- only the wrapper that
 *  positions it (grid cell vs. carousel slide) differs. */
function RoundFigure({ round }: { round: RoundDef }) {
  const { Icon } = round;
  return (
    <>
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {round.fig}
      </span>
      {/* text-muted, not text-line-strong: at a 1px stroke on near-black,
          border-weight grey reads as a smudge rather than a drawing. Muted
          still sits a step below the blurb's --text-secondary, so the
          hierarchy runs title > blurb > figure as intended. */}
      <Icon className="mt-7 h-24 w-24 text-muted" />
      <h3 className="mt-7 text-lg font-semibold tracking-tight text-primary">
        {round.title}
      </h3>
      <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-secondary">
        {round.blurb}
      </p>
    </>
  );
}

export default function RoundsShowcase() {
  return (
    // relative + the two absolutely-positioned blurred blobs below give the
    // whole showcase ambient depth instead of floating flat against the page
    // background -- kept inside THIS wrapper (not the overflow-hidden preview
    // card) specifically so the blur is free to bleed past the card's own
    // edges rather than being clipped by it.
    <div className="relative mt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 right-0 h-72 w-72 rounded-full bg-accent-muted blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-1/4 h-56 w-56 rounded-full bg-accent-muted blur-[100px] opacity-60"
      />

      <div className="relative">
        {/* ---- Figures: three columns, md and up ----
            divide-x draws the hairline BETWEEN columns only (no border on
            the outer edges), which is the whole look -- three things sharing
            one plane, not three boxes. Padding is symmetric except at the
            two ends, so the first column's text starts flush with the
            section's left edge and the last ends flush with its right. */}
        <div className="hidden grid-cols-3 divide-x divide-line md:grid">
          {ROUNDS.map((r) => (
            <div
              key={r.key}
              className="flex flex-col px-7 first:pl-0 last:pr-0"
            >
              <RoundFigure round={r} />
            </div>
          ))}
        </div>

        {/* ---- Figures: carousel, below md ----
            Three columns will not fit on a phone at a readable size, and
            stacking them costs a full screen of scrolling before the mockup
            below is reachable. A snap carousel keeps the set to one screen
            and keeps all three equally available -- the peek of the next
            column past the right edge is the affordance that says so.

            Width is under 100% ON PURPOSE: that remainder IS the peek. */}
        <div
          className="flex snap-x snap-mandatory gap-0 overflow-x-auto pb-2 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ROUNDS.map((r) => (
            <div
              key={r.key}
              className="flex w-[82%] shrink-0 snap-start flex-col border-l border-line pl-6 pr-6 first:border-l-0 first:pl-0"
            >
              <RoundFigure round={r} />
            </div>
          ))}
        </div>

        {/* ---- Product mockup ----
            One static panel now rather than one per round. With the tabs
            gone there is no selection for it to follow, and cycling it on a
            timer would be movement the reader did not ask for. The coding
            round is the one shown because it is the only round whose panel
            demonstrates all three things at once -- interviewer, work
            surface, and the signal rail scoring it -- which is the claim the
            figures above are making. */}
        <div className="isolate mt-10 overflow-hidden rounded-lg border border-line bg-base shadow-xl shadow-[var(--shadow-md)] lg:mt-12">
          <BrowserChrome url="loopready.io/session · coding" />
          {/* No min-height. The tabbed version needed one because its panels
              were absolutely positioned for the crossfade and so had no
              height of their own; a single static panel sizes itself, and
              forcing the old floor here just left dead space under the
              shortest column. */}
          <CodingPreview />
        </div>
      </div>
    </div>
  );
}

/** Condensed editor + console, now with two more panels flanking it: a
 *  compact interviewer column on the left (who's asking) and a Signal rail
 *  on the right (what the interviewer is quietly keeping score of). Three
 *  columns rather than one, because the product's whole pitch is that
 *  something is watching and judging while you work -- a single code panel
 *  cannot show that, no matter how well it renders Python. */
function CodingPreview() {
  return (
    <div className="grid h-full md:grid-cols-[minmax(0,0.62fr)_minmax(0,1.18fr)_minmax(0,0.62fr)]">
      <MiniInterviewer question="Walk me through your approach before you write anything." />

      <div className="flex flex-col border-b border-line md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-[11px]">
          <span className="rounded-sm bg-elevated px-2 py-0.5 font-mono text-secondary">
            solution.py
          </span>
          <span className="text-muted">Valid Parentheses</span>
          <span className="ml-auto rounded-sm border border-line px-2 py-0.5 text-muted">
            Run tests
          </span>
        </div>
        {/* No flex-1 here anymore: it used to stretch this block to fill
            whatever height the taller flanking columns needed, leaving a
            large blank gap between line 5 and the console output. Natural
            height plus a blinking caret at the end of the last line reads
            as "mid-thought", not "ran out of content". */}
        <pre className="overflow-x-auto bg-inset px-4 py-3 font-mono text-xs leading-relaxed">
          <code className="text-primary">
            <span className="text-muted">1 </span>
            <span className="text-accent-cool">def</span>{" "}
            <span className="text-accent">is_valid</span>(s):{"\n"}
            <span className="text-muted">2 </span>
            {"    "}stack = []{"\n"}
            <span className="text-muted">3 </span>
            {"    "}
            <span className="text-accent-cool">for</span> c <span className="text-accent-cool">in</span> s:{"\n"}
            <span className="text-muted">4 </span>
            {"        "}
            <span className="text-accent-cool">if</span> c <span className="text-accent-cool">in</span> <span className="text-accent">&quot;([{"{"}&quot;</span>:{"\n"}
            <span className="text-muted">5 </span>
            {"            "}stack.append(c)
            <motion.span
              className="ml-px inline-block h-3 w-px translate-y-[2px] bg-accent"
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
            />
          </code>
        </pre>
        <div className="space-y-1 border-t border-line px-4 py-3 font-mono text-[11px]">
          <p className="text-secondary">
            <span className="text-success">✓</span> is_valid(&quot;()[]{"{}"}&quot;) → True
          </p>
          <p className="text-secondary">
            <span className="text-error">✕</span> is_valid(&quot;(]&quot;) → expected False, got True
          </p>
        </div>
        {/* Same bottom-anchored footer treatment as the interviewer and
            signal columns either side, so all three read as one deliberate
            set instead of two "finished" panels around one that trails off. */}
        <p className="mt-auto flex items-center gap-1.5 border-t border-line px-4 py-2.5 text-[10px] text-muted">
          <span className="h-1 w-1 rounded-full bg-success" />
          Auto-saved just now
        </p>
      </div>

      <SignalRail
        tracking={["Time complexity", "Edge cases", "Approach clarity"]}
        status="Watching your last edit"
        flag="Missed edge case — empty input string"
      />
    </div>
  );
}

/**
 * Compact stand-in for the interviewer, sized for a THIRD of a panel rather
 * than the hero's full column. A static "LR" badge would read as decoration;
 * the pulsing ring plus the question underneath is what makes this column
 * earn its place instead of just being a smaller logo.
 */
function MiniInterviewer({ question }: { question: string }) {
  return (
    <div className="flex h-full flex-col gap-4 border-b border-line bg-base p-4 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2">
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-muted">
          <span className="ring-pulse absolute inset-0 rounded-full border border-accent-border" />
          <span className="text-[10px] font-semibold text-accent">LR</span>
        </span>
        <span className="text-xs font-medium text-primary">Interviewer</span>
      </div>
      <p className="text-xs leading-relaxed text-secondary">{question}</p>

      {/* Anchors this column to the same bottom edge Signal's status line
          anchors to, so the two flanking columns read as a matched pair
          instead of the interviewer side trailing off into empty space. */}
      <p className="mt-auto text-[10px] text-muted">
        Live · calibrated to Amazon SDE II
      </p>
    </div>
  );
}

/**
 * The "product is actively judging you" panel. Concrete and specific rather
 * than a generic "AI is analysing" spinner: it names exactly what it is
 * tracking, and shows one real flagged moment rather than a vague sentiment
 * ("looking good!") that could belong to any product.
 */
function SignalRail({
  tracking,
  status,
  flag,
}: {
  tracking: string[];
  status: string;
  flag: string;
}) {
  return (
    <div className="flex h-full flex-col gap-4 bg-base p-4">
      {/* SIGNAL is the panel's own name, so it gets a real heading treatment
          -- size and weight, not another small muted eyebrow -- while
          Tracking and Flagged stay eyebrow-scale below it. The first version
          put all three labels at the same ~10px muted-uppercase weight,
          which read as three equal headings competing rather than one
          heading with two subsections under it. */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="text-sm font-semibold text-primary">Signal</span>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted">Tracking</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tracking.map((t) => (
            <span
              key={t}
              className="rounded-full border border-line-strong px-2 py-0.5 text-[10px] text-secondary"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="isolate rounded-md border border-warn/30 bg-warn-muted p-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-warn">
          Flagged
        </p>
        <p className="mt-1 text-xs leading-relaxed text-warn">{flag}</p>
      </div>

      <p className="mt-auto flex items-center gap-1.5 text-[10px] text-muted">
        <span className="h-1 w-1 animate-pulse rounded-full bg-muted" />
        {status}…
      </p>
    </div>
  );
}

