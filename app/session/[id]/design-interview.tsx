"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RoundShell from "./round-shell";
import DesignCanvas, { type DesignState } from "./design-canvas";
import type { Turn } from "./use-voice-turn";

/**
 * System design round. Same voice experience as every other round; the canvas
 * is simply the work surface.
 */
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
  const [state, setState] = useState<DesignState>(initialState);
  const latest = useRef(initialState);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  return (
    <RoundShell
      sessionId={sessionId}
      initialTurns={initialTurns}
      header={header}
      getArtifactPatch={() => ({
        nodes: latest.current.nodes,
        edges: latest.current.edges,
      })}
      renderSurface={({ pushArtifact }) => (
        <DesignSurface
          design={design}
          initialState={initialState}
          onChange={(s) => {
            setState(s);
            pushArtifact();
          }}
        />
      )}
    />
  );
}

function DesignSurface({
  design,
  initialState,
  onChange,
}: {
  design: { title: string; statement: string };
  initialState: DesignState;
  onChange: (state: DesignState) => void;
}) {
  const [showPrompt, setShowPrompt] = useState(true);
  const handleChange = useCallback((s: DesignState) => onChange(s), [onChange]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <button
        onClick={() => setShowPrompt((p) => !p)}
        className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5 text-left"
      >
        <span className="text-sm font-medium text-zinc-300">{design.title}</span>
        <span className="text-xs text-zinc-600">
          {showPrompt ? "hide" : "show"}
        </span>
      </button>
      {showPrompt && (
        <p className="border-b border-zinc-800 px-4 py-3 text-sm leading-relaxed text-zinc-400">
          {design.statement}
        </p>
      )}
      <div className="min-h-0 flex-1">
        <DesignCanvas initial={initialState} onChange={handleChange} />
      </div>
    </div>
  );
}
