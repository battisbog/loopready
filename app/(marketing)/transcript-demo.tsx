"use client";

import { useEffect, useState } from "react";

const SCRIPT: { role: "interviewer" | "candidate"; text: string }[] = [
  {
    role: "interviewer",
    text: "Tell me about a project you're proud of. What was your specific role?",
  },
  {
    role: "candidate",
    text: "We rebuilt the analytics dashboard. It was a big project and everyone was happy with it.",
  },
  {
    role: "interviewer",
    text: "What exactly was your role — and if you'd been on vacation that month, what would have happened?",
  },
  {
    role: "candidate",
    text: "I owned the query layer. I found the N+1 that made p95 load 9 seconds…",
  },
  {
    role: "interviewer",
    text: "How did you measure the improvement?",
  },
];

export default function TranscriptDemo() {
  const [shown, setShown] = useState(1);

  useEffect(() => {
    if (shown >= SCRIPT.length) return;
    const delay = SCRIPT[shown].role === "interviewer" ? 1900 : 1500;
    const t = setTimeout(() => setShown((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [shown]);

  const thinking = shown < SCRIPT.length && SCRIPT[shown].role === "interviewer";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-2xl shadow-emerald-500/5 backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <span className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live interview
        </span>
        <span className="font-mono text-xs text-zinc-600">Question 1 of 3</span>
      </div>

      <div className="mt-4 min-h-[19rem] space-y-3">
        {SCRIPT.slice(0, shown).map((line, i) => (
          <div
            key={i}
            className={`rise max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
              line.role === "interviewer"
                ? "bg-zinc-800/70 text-zinc-200"
                : "ml-auto bg-emerald-500/15 text-emerald-100"
            }`}
          >
            {line.text}
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-1.5 px-1 py-2 text-zinc-600">
            <Dot delay="0ms" />
            <Dot delay="150ms" />
            <Dot delay="300ms" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-zinc-800 pt-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5 text-zinc-950"
          >
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
            <path d="M12 18v4" />
          </svg>
        </span>
        <span className="text-xs text-zinc-500">
          Tap to answer out loud — no typing
        </span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-600"
      style={{ animationDelay: delay }}
    />
  );
}
