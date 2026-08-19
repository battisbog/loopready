"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";
import type { Turn } from "./use-voice-turn";
import { contextUpdateMessage } from "@/lib/video/tavus";

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
}: {
  sessionId: string;
  initialTurns: Turn[];
  onDone: (nextSessionId: string | null, loopId?: string | null) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [status, setStatus] = useState<VideoStatus>("starting");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [room, setRoom] = useState<{ conversationUrl: string } | null>(null);

  const callRef = useRef<DailyCall | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const aliveRef = useRef(true);
  const startedRef = useRef(false);
  const settledRef = useRef(false);

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
    if (startedRef.current) return;
    startedRef.current = true;
    aliveRef.current = true;

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
        setRoom({ conversationUrl: cfg.conversationUrl });
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

  // Leaving the page mid-interview must still settle, or the credit stays
  // reserved and the user cannot start another.
  useEffect(() => {
    const onHide = () => {
      if (!settledRef.current) void settle("user_ended");
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [settle]);

  /** Records a finalized turn and applies whatever the server decides next. */
  const recordTurn = useCallback(
    async (role: "candidate" | "interviewer", text: string) => {
      if (!text.trim() || !aliveRef.current) return;
      setTurns((t) => [...t, { role, text }]);
      if (role !== "candidate") {
        void fetch("/api/realtime/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, role, text }),
        });
        return;
      }
      const res = await fetch("/api/realtime/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, role, text }),
      });
      const data = await res.json().catch(() => null);
      if (!data || !aliveRef.current) return;

      // Relay refreshed instructions into the room over the data channel.
      if (data.instructions && callRef.current && conversationIdRef.current) {
        callRef.current.sendAppMessage(
          contextUpdateMessage(conversationIdRef.current, data.instructions),
          "*"
        );
      }
      if (data.done) {
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
      if (/utterance|transcription/.test(type)) {
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
    await settle("user_ended");
    const res = await fetch("/api/interview/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json().catch(() => ({}));
    onDone(data.nextRound?.sessionId ?? null, data.loopComplete ?? null);
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
  };
}
