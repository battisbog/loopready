"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeTurn } from "./use-realtime-turn";
import type { Turn } from "./use-voice-turn";
import InterviewerStage from "./interviewer-stage";
import LiveIndicator from "./live-indicator";
import TranscriptPanel from "./transcript-panel";
import { Badge } from "@/components/ui";

/** Hands-free behavioral round. No mic button; the mic is open throughout. */
export default function LiveInterview({
  sessionId,
  initialTurns,
  questionIndex,
  questionCount,
  header,
}: {
  sessionId: string;
  initialTurns: Turn[];
  questionIndex: number;
  questionCount: number;
  header?: string;
}) {
  const router = useRouter();
  const [qIndex, setQIndex] = useState(questionIndex);

  const {
    turns,
    status,
    statusLabel,
    error,
    elapsed,
    partial,
    endEarly,
    speaking,
  } = useRealtimeTurn({
    sessionId,
    initialTurns,
    onProgress: ({ questionIndex: i }) => setQIndex(i),
    onDone: (next, loopId) =>
      router.push(
        next
          ? `/session/${next}`
          : loopId
            ? `/loop/${loopId}`
            : `/session/${sessionId}/feedback`
      ),
  });

  const lastInterviewer = [...turns]
    .reverse()
    .find((t) => t.role === "interviewer");
  const progress = Math.min(qIndex + 1, questionCount);

  // Show the interviewer's words as they are spoken, then the settled turn.
  const spokenLine =
    partial?.role === "interviewer" && partial.text
      ? partial.text
      : lastInterviewer?.text;

  return (
    <main className="flex h-screen flex-col bg-zinc-950">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-900 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {header && (
            <span className="font-medium text-emerald-400">{header}</span>
          )}
          <span className="text-zinc-400">
            Question {progress} of {questionCount}
          </span>
          <span className="font-mono text-xs text-zinc-600">
            {Math.floor(elapsed / 60000)}:
            {String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0")}
          </span>
          <Badge tone="accent" dot>
            Live voice
          </Badge>
        </div>
        <button
          onClick={endEarly}
          className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
        >
          End interview
        </button>
      </header>

      <div className="flex shrink-0 gap-1 px-4 pt-3 sm:px-6">
        {Array.from({ length: questionCount }).map((_, i) => (
          <span
            key={i}
            className={`h-0.5 flex-1 rounded-full transition-colors duration-500 ${
              i < progress ? "bg-emerald-500" : "bg-zinc-800"
            }`}
          />
        ))}
      </div>

      <section className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-8">
        <InterviewerStage
          status={speaking ? "speaking" : "idle"}
          line={spokenLine}
          variant="hero"
        />
      </section>

      <section className="shrink-0 space-y-4 border-t border-zinc-900 px-6 py-6">
        <LiveIndicator
          status={status}
          statusLabel={statusLabel}
          error={error}
          partial={partial}
        />
        <TranscriptPanel turns={turns} className="text-center" />
      </section>
    </main>
  );
}
