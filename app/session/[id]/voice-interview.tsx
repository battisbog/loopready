"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVoiceTurn, type Turn } from "./use-voice-turn";
import AudioSourceBadge from "./audio-source-badge";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    turns,
    status,
    statusLabel,
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
    onDone: (next) =>
      router.push(next ? `/session/${next}` : `/session/${sessionId}/feedback`),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, status]);

  return (
    <main className="mx-auto flex h-screen w-full max-w-2xl flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3 text-sm font-medium text-zinc-400">
          {header && <span className="text-emerald-400">{header}</span>}
          Question {Math.min(qIndex + 1, questionCount)} of {questionCount}
          <span className="font-mono text-xs text-zinc-600">
            {Math.floor(elapsed / 60000)}:
            {String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0")}
          </span>
          <AudioSourceBadge serverAudio={serverAudio} />
        </span>
        <button
          onClick={endEarly}
          className="text-sm text-zinc-600 hover:text-zinc-400"
        >
          End interview early
        </button>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-4">
        {turns.map((t, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              t.role === "interviewer"
                ? "bg-zinc-900 text-zinc-200"
                : "ml-auto bg-emerald-500/15 text-emerald-100"
            }`}
          >
            {t.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col items-center gap-3 pb-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-amber-400/80">{hint}</p>}
        <button
          onClick={toggleRecording}
          disabled={busy || status === "done"}
          aria-label={recording ? "Stop recording" : "Start recording"}
          className={`flex h-20 w-20 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
            recording
              ? "animate-pulse bg-red-500 hover:bg-red-400"
              : "bg-emerald-500 hover:bg-emerald-400"
          }`}
        >
          {recording ? (
            <div className="h-6 w-6 rounded-sm bg-zinc-950" />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-8 w-8 text-zinc-950"
            >
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
              <path d="M12 18v4" />
            </svg>
          )}
        </button>
        <p className="text-sm text-zinc-500">{statusLabel}</p>
      </div>
    </main>
  );
}
