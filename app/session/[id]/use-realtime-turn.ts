"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeSession } from "@/lib/realtime/client";
import type { Turn } from "./use-voice-turn";

export type LiveStatus =
  | "connecting"
  | "listening"
  | "speaking"
  | "thinking"
  | "done"
  | "failed";

const STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: "Connecting…",
  listening: "Listening. Just talk, and pause when you're finished",
  speaking: "Interviewer is speaking. You can cut in any time",
  thinking: "Interviewer is thinking…",
  done: "Interview complete",
  failed: "Connection failed",
};

interface Options {
  sessionId: string;
  initialTurns: Turn[];
  getArtifactPatch?: () => object | undefined;
  onProgress?: (data: { questionIndex: number }) => void;
  onDone: (nextSessionId: string | null, loopId?: string | null) => void;
}

/**
 * Hands-free live interview over WebRTC. There is no push-to-talk: the mic is
 * open for the whole round and the model's semantic VAD decides when the
 * candidate has finished a thought.
 */
export function useRealtimeTurn({
  sessionId,
  initialTurns,
  getArtifactPatch,
  onProgress,
  onDone,
}: Options) {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [partial, setPartial] = useState<{ role: string; text: string } | null>(
    null
  );

  const sessionRef = useRef<RealtimeSession | null>(null);
  const aliveRef = useRef(true);
  const startedRef = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, []);

  const post = useCallback(
    async (body: object) => {
      const res = await fetch("/api/realtime/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ...body }),
      });
      if (!res.ok) return null;
      return res.json();
    },
    [sessionId]
  );

  /** Applies whatever the server decided after a turn or an advance request. */
  const applyServerDecision = useCallback(
    (data: {
      instructions?: string | null;
      sayNext?: string | null;
      done?: boolean;
      questionIndex?: number;
      nextRound?: { sessionId: string } | null;
      loopComplete?: string | null;
    } | null) => {
      if (!data || !aliveRef.current) return;
      const live = sessionRef.current;

      if (typeof data.questionIndex === "number") {
        onProgress?.({ questionIndex: data.questionIndex });
      }
      if (data.instructions && live) live.updateInstructions(data.instructions);
      if (data.sayNext && live) live.speak(data.sayNext);

      if (data.done) {
        setStatus("done");
        // Let the closing line finish before tearing the connection down.
        setTimeout(() => {
          sessionRef.current?.stop();
          onDone(data.nextRound?.sessionId ?? null, data.loopComplete ?? null);
        }, 6000);
      }
    },
    [onDone, onProgress]
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    aliveRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const cfg = await res.json();
        if (!res.ok) throw new Error(cfg.error ?? "Could not start live mode");
        if (!aliveRef.current) return;

        const live = new RealtimeSession();
        sessionRef.current = live;

        await live.start({
          clientSecret: cfg.clientSecret,
          model: cfg.model,
          greeting: cfg.greeting,
          history: cfg.history ?? [],
          handlers: {
            onCandidateTurn: (text) => {
              if (!aliveRef.current) return;
              setPartial(null);
              setTurns((t) => [...t, { role: "candidate", text }]);
              post({
                role: "candidate",
                text,
                artifact: getArtifactPatch?.(),
              }).then(applyServerDecision);
            },
            onInterviewerTurn: (text) => {
              if (!aliveRef.current) return;
              setPartial(null);
              setTurns((t) => [...t, { role: "interviewer", text }]);
              // Recorded only; interviewer turns never move the state machine.
              void post({ role: "interviewer", text });
            },
            onPartial: (role, delta) =>
              setPartial((p) =>
                p && p.role === role
                  ? { role, text: p.text + delta }
                  : { role, text: delta }
              ),
            onSpeakingChange: (speaking) =>
              setStatus((s) =>
                s === "done" || s === "failed"
                  ? s
                  : speaking
                    ? "speaking"
                    : "listening"
              ),
            onBargeIn: () => setPartial(null),
            onAdvanceRequested: (callId) => {
              // The server decides whether the request is allowed.
              post({ advanceOnly: true }).then((data) => {
                sessionRef.current?.resolveAdvance(callId, Boolean(data?.advanced));
                applyServerDecision(data);
              });
            },
            onError: (message) => {
              if (aliveRef.current) setError(message);
            },
          },
        });

        if (aliveRef.current) setStatus("listening");
      } catch (e) {
        if (!aliveRef.current) return;
        setStatus("failed");
        setError(
          e instanceof Error ? e.message : "Could not start the live interview"
        );
      }
    })();

    return () => {
      aliveRef.current = false;
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const endEarly = useCallback(async () => {
    aliveRef.current = false;
    sessionRef.current?.stop();
    const res = await fetch("/api/interview/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json().catch(() => ({}));
    onDone(data.nextRound?.sessionId ?? null, data.loopComplete ?? null);
  }, [sessionId, onDone]);

  return {
    turns,
    status,
    statusLabel: STATUS_LABEL[status],
    error,
    elapsed,
    partial,
    endEarly,
    speaking: status === "speaking",
    connecting: status === "connecting",
  };
}
