"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";
import type { Turn } from "./use-voice-turn";
import { contextUpdateMessage } from "@/lib/video/tavus";
import { postTurn } from "@/lib/interview/post-turn";
import { endInterviewBeacon } from "@/lib/interview/end-beacon";

export type VideoStatus =
  | "starting"
  | "connecting"
  | "listening"
  | "speaking"
  | "done"
  | "failed";

/**
 * Video-avatar interview.
 *
 * The important difference from the voice path: Tavus runs the conversation
 * with its own LLM, so we do not generate replies. We supply the instructions,
 * observe the transcript, run the same state machine, and push refreshed
 * instructions back in.
 *
 * Those updates cannot go server-to-Tavus: the REST endpoint does not exist and
 * the interactions protocol travels over the Daily data channel. So the server
 * returns instructions and this hook relays them through sendAppMessage.
 */
export function useVideoTurn({
  sessionId,
  initialTurns,
  onDone,
  onLeave,
}: {
  sessionId: string;
  initialTurns: Turn[];
  onDone: (nextSessionId: string | null, loopId?: string | null) => void;
  /** Called when the candidate ends the whole interview. */
  onLeave: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [status, setStatus] = useState<VideoStatus>("starting");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [room, setRoom] = useState<{
    conversationUrl: string;
    maxMinutes: number;
    demo: boolean;
    demoEndsAt: string | null;
  } | null>(null);

  const callRef = useRef<DailyCall | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const aliveRef = useRef(true);
  const startedRef = useRef(false);
  const settledRef = useRef(false);
  // True once the round has genuinely finished (button click or normal
  // completion). A pagehide AFTER this must not re-abandon a loop that is
  // correctly moving on to its next round or to feedback.
  const finishedRef = useRef(false);

  useEffect(() => {
    const t0 = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - t0), 1000);
    return () => clearInterval(t);
  }, []);

  /** Settles the credit exactly once, whatever route we leave by. */
  const settle = useCallback(
    async (reason: "completed" | "user_ended" | "connect_failed" | "session_failed") => {
      if (settledRef.current) return;
      settledRef.current = true;
      try {
        await fetch("/api/video/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, reason }),
          keepalive: true,
        });
      } catch {
        // The Tavus-side cap and the callback still close the room.
      }
    },
    [sessionId]
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
        const res = await fetch("/api/video/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const cfg = await res.json();
        if (!res.ok) throw new Error(cfg.error ?? "Could not start video mode");
        if (!aliveRef.current) return;
        conversationIdRef.current = cfg.conversationId;
        setRoom({
          conversationUrl: cfg.conversationUrl,
          maxMinutes: Number(cfg.maxMinutes ?? 45),
          demo: Boolean(cfg.demo),
          demoEndsAt: cfg.demoEndsAt ?? null,
        });
        setStatus("connecting");
      } catch (e) {
        if (!aliveRef.current) return;
        setStatus("failed");
        setError(e instanceof Error ? e.message : "Could not start video mode");
        // Never connected, so the candidate keeps their credit.
        void settle("connect_failed");
      }
    })();

    return () => {
      aliveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Leaving the page mid-interview must still fully end it: settle any held
  // credit AND abandon the whole loop, exactly like clicking "End interview"
  // does. Without the second half, the credit used to settle correctly but the
  // session and loop stayed "active" in the database forever.
  useEffect(() => {
    const onHide = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      endInterviewBeacon(sessionId, true);
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [sessionId]);

  /** Records a finalized turn and applies whatever the server decides next. */
  const recordTurn = useCallback(
    async (role: "candidate" | "interviewer", text: string) => {
      if (!text.trim() || !aliveRef.current) return;
      setTurns((t) => [...t, { role, text }]);
      if (role !== "candidate") {
        void postTurn(sessionId, { role, text });
        return;
      }
      // res.ok was never checked here: an error body is still valid JSON, so a
      // 429 or a 503 read as success and was quietly discarded, leaving the
      // turn unrecorded and the phase machine frozen while Tavus carried on
      // interviewing.
      const result = await postTurn(sessionId, { role, text });
      if (!result.ok && result.error && aliveRef.current) setError(result.error);
      const data = result.data;
      if (!data || !aliveRef.current) return;

      // Relay refreshed instructions into the room over the data channel.
      if (data.instructions && callRef.current && conversationIdRef.current) {
        callRef.current.sendAppMessage(
          contextUpdateMessage(conversationIdRef.current, data.instructions),
          "*"
        );
      }
      if (data.done) {
        // A normal finish, not an abandonment: the pagehide beacon must not
        // fire for whatever tab-close happens during the 8s closing line or
        // the subsequent navigation.
        finishedRef.current = true;
        setStatus("done");
        await settle("completed");
        setTimeout(
          () => onDone(data.nextRound?.sessionId ?? null, data.loopComplete ?? null),
          8000
        );
      }
    },
    [sessionId, onDone, settle]
  );

  /** Tavus reports transcript and speaking state over the data channel. */
  const onAppMessage = useCallback(
    (raw: unknown) => {
      const msg = raw as { event_type?: string; properties?: Record<string, unknown> };
      const type = msg?.event_type ?? "";
      if (/replica.started_speaking/.test(type)) setStatus("speaking");
      if (/replica.stopped_speaking/.test(type)) setStatus("listening");
      // Tavus sends TWO distinct events per line: "conversation.utterance_streaming"
      // fires repeatedly as the text grows token by token, and
      // "conversation.utterance" fires once with the complete line. The old regex
      // (/utterance|transcription/) matched both, so every partial got recorded
      // as its own turn -- a spoken sentence became a dozen duplicate/fragment
      // rows. Only the non-streaming event is a finished turn.
      if (/utterance/.test(type) && !/streaming/.test(type)) {
        const text = String(msg.properties?.speech ?? msg.properties?.text ?? "");
        const role = String(msg.properties?.role ?? "").toLowerCase();
        if (text) {
          void recordTurn(role === "replica" ? "interviewer" : "candidate", text);
        }
      }
    },
    [recordTurn]
  );

  const endEarly = useCallback(async () => {
    aliveRef.current = false;
    finishedRef.current = true;
    // Marking the session complete is the part that must not be skipped, so it
    // runs even when the transport cleanup below throws. Leaving a row "active"
    // is what kept finished interviews showing as in progress.
    try {
      await settle("user_ended");
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
  }, [sessionId, onDone, settle]);

  return {
    turns,
    status,
    error,
    elapsed,
    room,
    endEarly,
    onAppMessage,
    onJoined: (call: DailyCall) => {
      callRef.current = call;
      setStatus("listening");
    },
    onVideoError: (message: string) => {
      setError(message);
      setStatus("failed");
      void settle("session_failed");
    },
    /**
     * The call ended on schedule -- Tavus's own duration cap, not a failure.
     * This is the demo's 30-second limit doing exactly what it is supposed to,
     * so it must read as a clean finish, never as an error screen.
     */
    onNaturalEnd: () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setStatus("done");
      void settle("completed").then(() => {
        if (!aliveRef.current) return;
        if (room?.demo) {
          // The demo is over. Send them straight to plans, not into feedback
          // for a 30-second clip or a "next round" that does not exist.
          window.location.assign(room.demoEndsAt ?? "/pricing");
          return;
        }
        // A real video round that ran out the clock is a finished round: route
        // it exactly like a normal completion (feedback for this session).
        setTimeout(() => onDone(null, null), 1500);
      });
    },
  };
}
