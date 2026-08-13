"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DesignCanvas, { type DesignState } from "./design-canvas";
import { useVoiceTurn, type Turn } from "./use-voice-turn";
import AudioSourceBadge from "./audio-source-badge";
import InterviewerStage from "./interviewer-stage";
import MicControl from "./mic-control";
import TranscriptPanel from "./transcript-panel";

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
  // Mirrors `state` for the voice turn callbacks; synced in an effect.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
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
    hint,
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

  const lastInterviewer = [...turns]
    .reverse()
    .find((t) => t.role === "interviewer");
  const lastCandidate = [...turns].reverse().find((t) => t.role === "candidate");

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

          <div className="flex flex-col items-center gap-4 border-b border-zinc-800 px-4 py-6">
            <InterviewerStage
              status={status}
              line={lastInterviewer?.text}
              variant="compact"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <TranscriptPanel turns={turns} className="text-center" />
          </div>

          <div className="border-t border-zinc-800 p-4">
            <MicControl
              status={status}
              recording={recording}
              busy={busy}
              onToggle={toggleRecording}
              answer={status === "idle" ? lastCandidate?.text : undefined}
              error={error}
              hint={hint}
              size="small"
            />
          </div>
        </aside>

        <section className="min-h-0">
          <DesignCanvas initial={initialState} onChange={handleChange} />
        </section>
      </div>
    </main>
  );
}
