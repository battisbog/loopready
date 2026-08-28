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
    <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-10">
      {/* ---- Tab list ---- */}
      <div className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-3">
        {ROUNDS.map((r) => {
          const isActive = r.key === active;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setActive(r.key)}
              aria-pressed={isActive}
              className={cn(
                "shrink-0 rounded-lg border px-4 py-3.5 text-left transition-colors lg:shrink",
                isActive
                  ? "border-accent-border bg-accent-muted"
                  : "border-line bg-surface hover:border-line-strong hover:bg-elevated"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isActive ? "text-accent" : "text-primary"
                  )}
                >
                  {r.title}
                </span>
                <Badge tone={isActive ? "accent" : "neutral"} className="ml-auto lg:hidden">
                  Live
                </Badge>
              </div>
              <p className="mt-1.5 hidden max-w-sm text-sm leading-relaxed text-secondary lg:block">
                {r.body}
              </p>
              {isActive && (
                <ul className="mt-3 hidden space-y-1.5 lg:block">
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
              )}
            </button>
          );
        })}
      </div>

      {/* ---- Live preview ---- */}
      <div className="overflow-hidden rounded-lg border border-line bg-base shadow-xl shadow-[var(--shadow-md)]">
        <BrowserChrome url={`loopready.io/session · ${round.title.toLowerCase().replace(" ", "-")}`} />
        <div className="relative min-h-[22rem]">
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
  );
}

/** Condensed editor + console. Deliberately smaller than the hero's session
 *  mockup and a different problem, so this reads as "another example", not a
 *  repeat of what the visitor already scrolled past. */
function CodingPreview() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-[11px]">
        <span className="rounded-sm bg-elevated px-2 py-0.5 font-mono text-secondary">
          solution.py
        </span>
        <span className="text-muted">Valid Parentheses</span>
      </div>
      <pre className="flex-1 overflow-x-auto bg-inset px-4 py-3 font-mono text-xs leading-relaxed">
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
      <div className="mt-auto border-t border-line bg-surface px-4 py-2.5 text-[11px] text-secondary">
        &ldquo;You&rsquo;re only pushing — walk me through what should happen on a
        closing bracket.&rdquo;
      </div>
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
