"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BrowserChrome } from "./dashboard-mockup";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Replaces three identical "icon, title, bullet list" cards with a tabbed
 * live-preview: pick a round on the left, see what it actually looks like on
 * the right. The three rounds are LoopReady's whole differentiator, so they
 * get a showcase rather than the same card shape as every other SaaS
 * features section on the internet.
 */
interface RoundDef {
  key: "coding" | "system_design" | "behavioral";
  title: string;
  /** Shorter label for the mobile pill tab bar, where all three labels must
   *  fit on one line -- "System design" is the only one long enough to need
   *  this. Falls back to `title` when absent. */
  mobileTitle?: string;
  body: string;
  points: string[];
}

const ROUNDS: RoundDef[] = [
  {
    key: "coding",
    title: "Coding",
    body: "A live editor the interviewer reads as you type, running your code against real test cases, with the same questions about approach and complexity you get on the day.",
    points: [
      "Python and JavaScript",
      "Real execution against tests",
      "Probes approach before code",
    ],
  },
  {
    key: "system_design",
    title: "System design",
    mobileTitle: "System",
    body: "An architecture canvas the interviewer can see and push back on, referencing your components by name and challenging hand-waving about scale.",
    points: [
      "Drag-and-drop components",
      "Interviewer reads your diagram",
      "Pushes on bottlenecks and trade-offs",
    ],
  },
  {
    key: "behavioral",
    title: "Behavioral",
    body: "Three questions across different competencies, each with real follow-up probing. Answered by voice, graded against your target company's values.",
    points: [
      "Voice in, voice out",
      "Up to two probes per question",
      "18-question bank across 6 competencies",
    ],
  },
];

export default function RoundsShowcase() {
  const [active, setActive] = useState<RoundDef["key"]>("coding");
  const round = ROUNDS.find((r) => r.key === active)!;

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
        {/* ---- Expanding tab row ----
            Three tabs share one row, in a fixed left-to-right order that
            never changes -- only each one's WIDTH changes on click. The
            active tab claims most of the row (full title + description +
            checklist); the other two collapse to a narrow title-only strip,
            still fully visible and clickable, not hidden behind a chevron
            or dropdown. `layout` on each button is what makes the width
            change animate smoothly instead of snapping -- Framer Motion
            (already a dependency here) interpolates the actual flexbox
            geometry between renders, which is the standard way to build
            this "shared position, one grows, others shrink" interaction. */}
        <div className="hidden gap-3 lg:flex">
          {ROUNDS.map((r) => {
            const isActive = r.key === active;
            return (
              <motion.button
                key={r.key}
                layout
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                type="button"
                onClick={() => setActive(r.key)}
                aria-pressed={isActive}
                className={cn(
                  // isolate: this card always gets its own stacking context,
                  // so nothing painted inside a SIBLING card (an unrelated
                  // element entirely) can ever be composited as if it
                  // belonged to this one, while several independent
                  // animations (this layout spring, the preview's crossfade,
                  // the caret blink) are all running at once nearby.
                  "isolate flex min-w-0 flex-col overflow-hidden rounded-lg border border-l-2 px-4 py-3.5 text-left transition-colors duration-200",
                  isActive
                    ? "flex-[3] border-line-strong border-l-accent bg-accent-muted"
                    : "flex-1 border-line border-l-line hover:border-line-strong hover:border-l-line-strong hover:bg-elevated"
                )}
              >
                <motion.span
                  layout="position"
                  className={cn(
                    "truncate text-sm font-semibold",
                    isActive ? "text-accent" : "text-primary"
                  )}
                >
                  {r.title}
                </motion.span>
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="mt-1.5 text-sm leading-relaxed text-secondary">
                        {r.body}
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {r.points.map((p) => (
                          <li
                            key={p}
                            className="flex items-start gap-2 text-xs text-secondary"
                          >
                            <span className="mt-0.5 text-accent">✓</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* ---- Mobile tab bar + content panel ----
            Below `lg`, the expanding-tab-row above is hidden entirely and
            replaced with two genuinely SEPARATE elements: a single-row pill
            tab bar containing only short labels (never card content, never
            an empty box for the inactive tabs -- the bug this replaces), and
            one content panel below it that renders only the active round.
            Content here is intentionally shorter than the desktop card
            (fewer bullets, clamped body) so the live-preview mockup right
            below it is reachable without a full extra screen of scrolling. */}
        <div className="lg:hidden">
          <div className="flex w-full gap-1 rounded-full border border-line bg-surface p-1">
            {ROUNDS.map((r) => {
              const isActive = r.key === active;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setActive(r.key)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex-1 rounded-full px-2 py-2 text-center text-xs font-medium transition-colors duration-200",
                    isActive
                      ? "bg-accent text-accent-fg"
                      : "text-muted hover:text-secondary"
                  )}
                >
                  {r.mobileTitle ?? r.title}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-line-strong border-l-2 border-l-accent bg-accent-muted px-4 py-3.5">
            <p className="line-clamp-2 text-sm leading-relaxed text-secondary">
              {round.body}
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {round.points.slice(0, 2).map((p) => (
                <li key={p} className="flex items-start gap-2 text-xs text-secondary">
                  <span className="mt-0.5 text-accent">✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---- Live preview ---- */}
        <div className="isolate mt-6 overflow-hidden rounded-lg border border-line bg-base shadow-xl shadow-[var(--shadow-md)] lg:mt-8">
          <BrowserChrome url={`loopready.io/session · ${round.title.toLowerCase().replace(" ", "-")}`} />
          <div className="relative min-h-[18rem] lg:min-h-[24rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                {active === "coding" && <CodingPreview />}
                {active === "system_design" && <SystemDesignPreview />}
                {active === "behavioral" && <BehavioralPreview />}
              </motion.div>
            </AnimatePresence>
          </div>
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

/** A small architecture graph, drawn with real SVG lines rather than an
 *  imported diagram image, so it can sit on the token palette and scale
 *  cleanly like everything else on the page. */
function SystemDesignPreview() {
  const nodes = [
    { id: "client", label: "Client", x: 40, y: 90 },
    { id: "lb", label: "Load balancer", x: 220, y: 90 },
    { id: "api", label: "API", x: 400, y: 40 },
    { id: "cache", label: "Cache", x: 400, y: 140 },
    { id: "db", label: "Postgres", x: 530, y: 90, w: 100 },
  ];
  const edges: [string, string][] = [
    ["client", "lb"],
    ["lb", "api"],
    ["lb", "cache"],
    ["api", "db"],
    ["cache", "db"],
  ];
  const at = (id: string) => nodes.find((n) => n.id === id)!;
  const NODE_W = 90;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-4 py-2 text-[11px] text-muted">
        Architecture canvas
      </div>
      <div className="flex-1 overflow-hidden bg-inset p-4">
        <svg viewBox="0 0 640 180" className="h-full w-full" aria-hidden>
          {edges.map(([a, b]) => {
            const from = at(a);
            const to = at(b);
            const fromW = from.w ?? NODE_W;
            return (
              <line
                key={`${a}-${b}`}
                x1={from.x + fromW}
                y1={from.y + 14}
                x2={to.x}
                y2={to.y + 14}
                stroke="var(--border-strong)"
                strokeWidth={1.5}
              />
            );
          })}
          {nodes.map((n) => (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              <rect
                width={n.w ?? NODE_W}
                height={28}
                rx={6}
                fill="var(--bg-surface)"
                stroke={n.id === "cache" ? "var(--accent-border)" : "var(--border-subtle)"}
                strokeWidth={1.5}
              />
              <text
                x={(n.w ?? NODE_W) / 2}
                y={18}
                textAnchor="middle"
                fontSize={10}
                fill={n.id === "cache" ? "var(--accent)" : "var(--text-primary)"}
                fontFamily="var(--font-geist-sans, sans-serif)"
              >
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-auto border-t border-line bg-surface px-4 py-2.5 text-[11px] text-secondary">
        &ldquo;You added a cache. What invalidates it when Postgres changes?&rdquo;
      </div>
    </div>
  );
}

/** Transcript with competency badges, distinct from the free-text lines used
 *  in the hero panel so this round reads as its own thing at a glance. */
function BehavioralPreview() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-[11px] text-muted">
        <Badge tone="outline">Ownership</Badge>
        <Badge tone="outline">Amazon · SDE II</Badge>
      </div>
      <div className="flex-1 space-y-4 px-4 py-4">
        <TranscriptLine role="interviewer">
          Tell me about a time you owned something that failed.
        </TranscriptLine>
        <TranscriptLine role="candidate">
          A migration I led caused a partial outage. I rolled it back,
          root-caused a missing index, and shipped the fix within the day.
        </TranscriptLine>
        <TranscriptLine role="interviewer">
          What would have happened if you had been on vacation that week?
        </TranscriptLine>
      </div>
      <div className="mt-auto border-t border-line bg-surface px-4 py-2.5 text-[11px] text-secondary">
        Probing for ownership without a safety net — a second follow-up, not
        the first.
      </div>
    </div>
  );
}

function TranscriptLine({
  role,
  children,
}: {
  role: "interviewer" | "candidate";
  children: string;
}) {
  const interviewer = role === "interviewer";
  return (
    <div className="flex gap-2.5">
      <span
        className={cn(
          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
          interviewer ? "bg-accent" : "bg-accent-cool"
        )}
      />
      <p
        className={cn(
          "text-sm leading-relaxed",
          interviewer ? "text-secondary" : "text-primary"
        )}
      >
        {children}
      </p>
    </div>
  );
}
