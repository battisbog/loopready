"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVoiceTurn, type Turn } from "./use-voice-turn";
import AudioSourceBadge from "./audio-source-badge";
import InterviewerStage from "./interviewer-stage";
import MicControl from "./mic-control";
import TranscriptPanel from "./transcript-panel";

export default function VoiceInterview({
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
    error,
    hint,
    elapsed,
    toggleRecording,
    endEarly,
    recording,
    busy,
    serverAudio,
  } = useVoiceTurn({
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
  const lastCandidate = [...turns].reverse().find((t) => t.role === "candidate");
  const progress = Math.min(qIndex + 1, questionCount);

  return (
    <main className="flex h-screen flex-col bg-zinc-950">
      {/* Top bar */}
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
          <AudioSourceBadge serverAudio={serverAudio} />
        </div>
        <button
          onClick={endEarly}
          className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
        >
          End interview
        </button>
      </header>

      {/* Progress rail */}
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

      {/* Stage — the interviewer is the screen */}
      <section className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-8">
        <InterviewerStage
          status={status}
          line={lastInterviewer?.text}
          variant="hero"
        />
      </section>

      {/* Candidate controls */}
      <section className="shrink-0 space-y-4 border-t border-zinc-900 px-6 py-6">
        <MicControl
          status={status}
          recording={recording}
          busy={busy}
          onToggle={toggleRecording}
          answer={status === "idle" ? lastCandidate?.text : undefined}
          error={error}
          hint={hint}
        />
        <TranscriptPanel turns={turns} className="text-center" />
      </section>
    </main>
  );
}
