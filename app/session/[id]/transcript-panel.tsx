"use client";

import { useEffect, useRef, useState } from "react";
import type { Turn } from "./use-voice-turn";

/** Full turn history, collapsed by default so the stage stays uncluttered. */
export default function TranscriptPanel({
  turns,
  className = "",
}: {
  turns: Turn[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, open]);

  return (
    <div className={className}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mx-auto flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-secondary"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        Transcript
        <span className="text-muted">({turns.length})</span>
      </button>

      {open && (
        <div className="mx-auto mt-3 max-h-64 w-full max-w-2xl space-y-3 overflow-y-auto rounded-lg border border-line bg-surface p-4">
          {turns.map((t, i) => (
            <div key={i} className="text-sm leading-relaxed">
              <span
                className={`mr-2 text-xs font-medium uppercase tracking-wide ${
                  t.role === "interviewer" ? "text-accent" : "text-muted"
                }`}
              >
                {t.role === "interviewer" ? "Interviewer" : "You"}
              </span>
              <span className="text-secondary">{t.text}</span>
            </div>
          ))}
          {turns.length === 0 && (
            <p className="text-sm text-muted">Nothing said yet.</p>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
