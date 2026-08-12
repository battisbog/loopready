"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DesignCanvas, { type DesignState } from "./design-canvas";
import { useVoiceTurn, type Turn } from "./use-voice-turn";
import AudioSourceBadge from "./audio-source-badge";

export default function DesignInterview({
  sessionId,
  initialTurns,
  header,
  design,
  initialState,
}: {
  sessionId: string;
  initialTurns: Turn[];
  header?: string;
  design: { title: string; statement: string };
  initialState: DesignState;
}) {
  const router = useRouter();
  const [state, setState] = useState<DesignState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [showPrompt, setShowPrompt] = useState(true);

  const {
    turns,
    status,
    statusLabel,
    error,
    elapsed,
    toggleRecording,
    endEarly,
    recording,
    busy,
    serverAudio,
  } = useVoiceTurn({
    sessionId,
    initialTurns,
    getArtifactPatch: () => ({
      nodes: stateRef.current.nodes,
      edges: stateRef.current.edges,
    }),
    onDone: (next) =>
      router.push(next ? `/session/${next}` : `/session/${sessionId}/feedback`),
  });

  // Autosave the diagram between spoken turns.
  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          patch: { nodes: state.nodes, edges: state.edges },
        }),
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [state, sessionId]);

  const handleChange = useCallback((s: DesignState) => setState(s), []);

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="flex items-center gap-3 text-sm font-medium text-zinc-300">
          {header && <span className="text-emerald-400">{header}</span>}
          <span className="font-mono text-xs text-zinc-600">
            {Math.floor(elapsed / 60000)}:
            {String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0")}
          </span>
          <AudioSourceBadge serverAudio={serverAudio} />
        </span>
        <button
          onClick={endEarly}
          className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
        >
          End interview
        </button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-zinc-800 lg:border-b-0 lg:border-r">
          <button
            onClick={() => setShowPrompt((p) => !p)}
            className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5 text-left"
          >
            <span className="text-xs font-medium text-zinc-400">
              {design.title}
            </span>
            <span className="text-xs text-zinc-600">
              {showPrompt ? "hide" : "show"}
            </span>
          </button>
          {showPrompt && (
            <p className="border-b border-zinc-800 px-4 py-3 text-sm leading-relaxed text-zinc-400">
              {design.statement}
            </p>
          )}

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {turns.map((t, i) => (
              <div
                key={i}
                className={`max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  t.role === "interviewer"
                    ? "bg-zinc-900 text-zinc-200"
                    : "ml-auto bg-emerald-500/15 text-emerald-100"
                }`}
              >
                {t.text}
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2 border-t border-zinc-800 p-4">
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={toggleRecording}
              disabled={busy || status === "done"}
              aria-label={recording ? "Stop recording" : "Start recording"}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                recording
                  ? "animate-pulse bg-red-500"
                  : "bg-emerald-500 hover:bg-emerald-400"
              }`}
            >
              {recording ? (
                <span className="h-4 w-4 rounded-sm bg-zinc-950" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6 text-zinc-950"
                >
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
                  <path d="M12 18v4" />
                </svg>
              )}
            </button>
            <p className="text-center text-xs text-zinc-500">{statusLabel}</p>
          </div>
        </aside>

        <section className="min-h-0">
          <DesignCanvas initial={initialState} onChange={handleChange} />
        </section>
      </div>
    </main>
  );
}
