"use client";

import { BrowserChrome } from "./dashboard-mockup";
import { cn } from "@/lib/cn";

/**
 * FIG-column layout (linear.app's reference pattern) -- replaces the earlier
 * tabbed/expanding-card design entirely, not a restyle of it. Deliberately
 * structurally different: no interactive state, no shared component between
 * the three columns, no truncation-prone tab bar. All three columns render
 * unconditionally and simultaneously on desktop; mobile gets a native
 * scroll-snap carousel instead of a tab switcher. There is nothing here that
 * can render as an "empty box" the way the old expanding tabs could, because
 * nothing is conditionally hidden -- every column always has its full
 * content.
 */
interface RoundDef {
  key: "coding" | "system_design" | "behavioral";
  fig: string;
  title: string;
  description: string;
}

const ROUNDS: RoundDef[] = [
  {
    key: "coding",
    fig: "01",
    title: "Coding",
    description:
      "A live editor the interviewer reads as you type, running your code against real test cases.",
  },
  {
    key: "system_design",
    fig: "02",
    title: "System design",
    description:
      "An architecture canvas the interviewer can see and push back on, challenging hand-waving about scale.",
  },
  {
    key: "behavioral",
    fig: "03",
    title: "Behavioral",
    description:
      "Real follow-up probing by voice, graded against your target company's actual values.",
  },
];

export default function RoundsShowcase() {
  return (
    <div className="relative mt-12">
      {/* ---- Desktop: three flat columns, hairline dividers between them ----
          divide-x puts the 1px line BETWEEN columns only (never around the
          outside), and there is no bg/border-radius/shadow on the columns
          themselves -- flat against the page, matching the reference. */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:divide-x lg:divide-line">
        {ROUNDS.map((r) => (
          <FigColumn key={r.key} round={r} className="lg:px-8 lg:first:pl-0 lg:last:pr-0" />
        ))}
      </div>

      {/* ---- Mobile: native horizontal scroll-snap carousel ----
          No JS drag library, no active/inactive state -- the browser's own
          scroll-snap handles the swipe, and every card always shows its full
          label/title/description at readable size. w-[82%] is what makes the
          next card peek in from the right edge as the swipe affordance. */}
      <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 lg:hidden">
        {ROUNDS.map((r) => (
          <FigColumn
            key={r.key}
            round={r}
            className="w-[82%] shrink-0 snap-start"
          />
        ))}
      </div>

      {/* ---- Live preview ----
          Static now rather than swapping with a selected tab -- there is no
          longer a "selected" round to follow. Coding is kept as the one
          representative preview: it is the only round whose panel shows the
          interviewer, the work surface, AND the signal rail at once, which is
          the actual claim the three columns above are making. */}
      <div className="isolate mt-10 overflow-hidden rounded-lg border border-line bg-base shadow-xl shadow-[var(--shadow-md)] lg:mt-14">
        <BrowserChrome url="loopready.io/session · coding" />
        <div className="min-h-[18rem] lg:min-h-[24rem]">
          <CodingPreview />
        </div>
      </div>
    </div>
  );
}

function FigColumn({
  round,
  className,
}: {
  round: RoundDef;
  className?: string;
}) {
  return (
    <div className={cn("py-2", className)}>
      <p className="font-mono text-xs text-muted">FIG {round.fig}</p>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-primary">
        {round.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-secondary">
        {round.description}
      </p>
    </div>
  );
}

/** Condensed editor + console, with two more panels flanking it: a compact
 *  interviewer column on the left (who's asking) and a Signal rail on the
 *  right (what the interviewer is quietly keeping score of). Three columns
 *  rather than one, because the product's whole pitch is that something is
 *  watching and judging while you work -- a single code panel cannot show
 *  that, no matter how well it renders Python. */
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
            <span className="ml-px inline-block h-3 w-px translate-y-[2px] bg-accent" />
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
 * the ring plus the question underneath is what makes this column earn its
 * place instead of just being a smaller logo.
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
