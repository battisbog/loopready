"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeSession } from "@/lib/realtime/client";
import { endInterviewBeacon } from "@/lib/interview/end-beacon";
import { postTurn } from "@/lib/interview/post-turn";
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
  /** Granted before the round mounts; see mic-gate.tsx. */
  stream: MediaStream;
  getArtifactPatch?: () => object | undefined;
  onProgress?: (data: { questionIndex: number }) => void;
  onDone: (nextSessionId: string | null, loopId?: string | null) => void;
  /** Called when the candidate ends the whole interview. */
  onLeave: () => void;
}

/**
 * Hands-free live interview over WebRTC. There is no push-to-talk: the mic is
 * open for the whole round and the model's semantic VAD decides when the
 * candidate has finished a thought.
 */
export function useRealtimeTurn({
  sessionId,
  initialTurns,
  stream,
  getArtifactPatch,
  onProgress,
  onDone,
  onLeave,
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
  /** Set once the server says the interview is over; consumed by teardown. */
  const finishRef = useRef<{
    nextSessionId: string | null;
    loopId: string | null;
  } | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True once the round has genuinely finished (button click or normal
  // completion). This hook previously had NO unload handling at all: closing
  // the tab mid-interview left the session and the whole loop "active" in the
  // database forever, with nothing to ever clean it up.
  const finishedRef = useRef(false);
  // Held in a ref so teardown never needs to be rebuilt when the callback
  // identity changes. Committed in an effect rather than during render.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const startedAt = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, []);

  // Leaving the page mid-interview must still fully abandon it: mark this
  // session and every sibling round completed, and close the loop, exactly
  // like clicking "End interview" does.
  useEffect(() => {
    const onHide = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      endInterviewBeacon(sessionId, false);
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [sessionId]);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      const result = await postTurn(sessionId, body);
      // A live round keeps running even when our server is unreachable, so a
      // dropped turn is invisible unless we say so. Silence here truncated the
      // transcript the debrief is graded from.
      if (!result.ok && result.error && aliveRef.current) setError(result.error);
      return result.data;
    },
    [sessionId]
  );

  /** Ends the round exactly once, whichever signal gets here first. */
  const teardown = useCallback(() => {
    const finish = finishRef.current;
    if (!finish) return;
    finishRef.current = null;
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    sessionRef.current?.stop();
    onDoneRef.current(finish.nextSessionId, finish.loopId);
  }, []);

  /** Applies whatever the server decided after a turn or an advance request. */
  const applyServerDecision = useCallback(
    (data: {
      instructions?: string | null;
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
      // Instructions only. Nothing is ever spoken in reaction to a turn: the
      // model's own reply is already in flight by the time this returns, so a
      // second response.create would be rejected and dropped. The instructions
      // tell the model what to do on its NEXT reply instead.
      if (data.instructions && live) live.updateInstructions(data.instructions);

      if (data.done) {
        // A normal finish, not an abandonment: the pagehide beacon must not
        // fire for a tab-close during the closing line or the navigation that
        // follows it.
        finishedRef.current = true;
        setStatus("done");
        // Wait for the closing line to actually finish rather than padding a
        // fixed delay. This is end-of-interview teardown only and never sits in
        // the per-turn response path, but a flat timeout meant every candidate
        // stared at a finished interview for the remainder of it.
        finishRef.current = {
          nextSessionId: data.nextRound?.sessionId ?? null,
          loopId: data.loopComplete ?? null,
        };
        // Backstop: if the closing never plays (audio blocked, connection
        // dropped) the round must still end.
        finishTimerRef.current = setTimeout(teardown, 12_000);
      }
    },
    [onProgress, teardown]
  );

  useEffect(() => {
    // Restored BEFORE the guard. React strict mode mounts, cleans up, and
    // remounts in dev; if this sat after the guard the remount would leave
    // aliveRef false forever and silently swallow every state update,
    // including the error that explains why nothing started.
    aliveRef.current = true;
    if (startedRef.current) return;
    startedRef.current = true;

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
          shouldGreet: cfg.shouldGreet === true,
          history: cfg.history ?? [],
          stream,
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
            onSpeakingChange: (speaking) => {
              // The closing line has finished playing: end the round now
              // instead of waiting out the backstop timer.
              if (!speaking && finishRef.current) {
                // A short grace so the last syllable is not clipped.
                setTimeout(teardown, 900);
              }
              setStatus((s) =>
                s === "done" || s === "failed"
                  ? s
                  : speaking
                    ? "speaking"
                    : "listening"
              );
            },
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
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  /**
   * Pushes the current work surface (code, run results, diagram) to the model
   * without recording a turn. Called after "Run" and on a debounce while the
   * candidate edits, so the interviewer can reference what is on screen.
   */
  const pushArtifact = useCallback(async () => {
    const patch = getArtifactPatch?.();
    if (!patch || !sessionRef.current) return;
    const data = await post({ artifactOnly: true, artifact: patch });
    if (data?.instructions && aliveRef.current) {
      sessionRef.current.updateInstructions(data.instructions);
    }
  }, [getArtifactPatch, post]);

  const endEarly = useCallback(async () => {
    aliveRef.current = false;
    finishedRef.current = true;
    // Marking the session complete is the part that must not be skipped, so it
    // runs even when the transport cleanup below throws. Leaving a row "active"
    // is what kept finished interviews showing as in progress.
    try {
      sessionRef.current?.stop();
    } catch {
      /* transport teardown is best effort */
    }
    let data: { nextRound?: { sessionId: string }; loopComplete?: string } = {};
    try {
      const res = await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, abandonLoop: true }),
        keepalive: true,
      });
      data = await res.json().catch(() => ({}));
      if (!res.ok) console.error("[interview] end failed:", res.status, data);
    } catch (e) {
      console.error("[interview] end threw:", e);
    }
    // Ending means leaving. Never route into the next round: the candidate
    // just said they were done with the whole interview.
    onLeave();
  }, [sessionId, onDone]);

  return {
    turns,
    status,
    statusLabel: STATUS_LABEL[status],
    error,
    elapsed,
    partial,
    endEarly,
    pushArtifact,
    speaking: status === "speaking",
    connecting: status === "connecting",
  };
}
